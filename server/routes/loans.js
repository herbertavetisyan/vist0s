const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { executeEnrichment } = require('../services/enrichmentService');
const documentService = require('../services/documentService');
const otpService = require('../services/otpService');

/**
 * 1. Application Submission
 * Creates a loan application and triggers asynchronous enrichment.
 */
router.post('/', async (req, res) => {
    try {
        const { nationalId, phone, email, amountRequested, termRequested, productTypeId } = req.body;

        // 1. Create or Find Entity
        let entity = await prisma.entity.findUnique({ where: { nationalId } });
        if (!entity) {
            // In a real flow, we'd have more details here
            entity = await prisma.entity.create({
                data: { nationalId, firstName: 'Applicant', lastName: 'User', type: 'INDIVIDUAL', phoneNumber: phone, email }
            });
        }

        // 2. Create Enrichment Request first to link it
        const enrichmentRequest = await prisma.enrichmentRequest.create({
            data: { nationalId, phone, email, status: 'PENDING' }
        });

        // 3. Create Loan Application
        const loanApplication = await prisma.loanApplication.create({
            data: {
                amountRequested,
                termRequested,
                status: 'ENRICHING',
                productTypeId: parseInt(productTypeId) || 1,
                enrichmentRequestId: enrichmentRequest.id
            }
        });

        // 4. Link Entity as Applicant
        await prisma.loanParticipant.create({
            data: {
                loanApplicationId: loanApplication.id,
                entityId: entity.id,
                role: 'APPLICANT'
            }
        });

        // 5. Start enrichment in background
        executeEnrichment({ nationalId, phone, email }, prisma, enrichmentRequest.id);

        res.status(202).json({
            applicationId: loanApplication.id,
            status: 'ENRICHING',
            message: 'Application submitted successfully. Processing enrichment and scoring.'
        });

    } catch (error) {
        console.error('Application Submission Error:', error);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

/**
 * 2. Get Offer
 * Retrieves the approved limit after scoring.
 */
router.get('/:id/offer', async (req, res) => {
    const { id } = req.params;
    const application = await prisma.loanApplication.findUnique({
        where: { id: parseInt(id) }
    });

    if (!application) return res.status(404).json({ error: 'Application not found' });

    if (application.status === 'ENRICHING') {
        return res.json({ status: 'ENRICHING', message: 'Scoring is still in progress.' });
    }

    if (application.status === 'REJECTED') {
        return res.json({ status: 'REJECTED', message: 'Application was not approved based on scoring.' });
    }

    res.json({
        applicationId: application.id,
        status: application.status,
        approvedLimit: application.approvedLimit,
        approvedTerm: application.approvedTerm,
        interestRate: application.interestRate,
        currency: application.currency
    });
});

/**
 * 3. Offer Selection
 * Client selects their final desired amount and term.
 */
router.post('/:id/selection', async (req, res) => {
    const { id } = req.params;
    const { selectedAmount, selectedTerm } = req.body;

    const application = await prisma.loanApplication.findUnique({ where: { id: parseInt(id) } });
    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Validate against approved limits
    if (parseFloat(selectedAmount) > parseFloat(application.approvedLimit)) {
        return res.status(400).json({ error: 'Selected amount exceeds approved limit.' });
    }

    await prisma.loanApplication.update({
        where: { id: parseInt(id) },
        data: {
            selectedAmount,
            selectedTerm,
            status: 'OFFER_SELECTED'
        }
    });

    res.json({ message: 'Offer selected successfully. Proceed to signing.', status: 'OFFER_SELECTED' });
});

/**
 * 9. Disbursement Details
 * Collects final bank account info and finishes the process.
 */
router.post('/:id/disbursement', async (req, res) => {
    const { id } = req.params;
    const { bankName, accountNumber } = req.body;

    const application = await prisma.loanApplication.findUnique({ where: { id: parseInt(id) } });
    if (!application) return res.status(404).json({ error: 'Application not found' });

    if (application.status !== 'OTP_VERIFIED') {
        return res.status(400).json({ error: 'OTP must be verified before providing bank details.' });
    }

    await prisma.loanApplication.update({
        where: { id: parseInt(id) },
        data: {
            bankName,
            accountNumber,
            status: 'DISBURSED'
        }
    });

    res.json({ message: 'Disbursement details saved. Loan process completed!', status: 'DISBURSED' });
});

/**
 * 4. Get Agreement
 * Retrieves the generated loan agreement.
 */
router.get('/:id/agreement', async (req, res) => {
    try {
        const { id } = req.params;
        const application = await prisma.loanApplication.findUnique({
            where: { id: parseInt(id) }
        });

        if (!application) return res.status(404).json({ error: 'Application not found' });

        if (!['OFFER_SELECTED', 'SIGNING', 'SIGNING_COMPLETE', 'OTP_VERIFIED', 'DISBURSED'].includes(application.status)) {
            return res.status(400).json({ error: 'Agreement not available until offer is selected.' });
        }

        const pdfBuffer = await documentService.generateAgreement(application, 'loan-agreement-v1');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=agreement-${id}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Agreement Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch agreement' });
    }
});

/**
 * 5. Sign Document
 * Marks the document as signed and transitions status.
 */
router.post('/:id/signing', async (req, res) => {
    try {
        const { id } = req.params;
        const application = await prisma.loanApplication.findUnique({ where: { id: parseInt(id) } });

        if (!application) return res.status(404).json({ error: 'Application not found' });
        if (application.status !== 'OFFER_SELECTED') {
            return res.status(400).json({ error: 'Application must be in OFFER_SELECTED status to sign.' });
        }

        await documentService.signDocument(application.id, 'loan-agreement-v1');

        await prisma.loanApplication.update({
            where: { id: parseInt(id) },
            data: { status: 'SIGNING_COMPLETE' }
        });

        res.json({ message: 'Document signed successfully. Proceed to OTP verification.', status: 'SIGNING_COMPLETE' });
    } catch (error) {
        console.error('Signing Error:', error);
        res.status(500).json({ error: 'Failed to sign document' });
    }
});

/**
 * 6. OTP Request
 * Generates and sends an OTP for final verification.
 */
router.post('/:id/otp-request', async (req, res) => {
    try {
        const { id } = req.params;
        const application = await prisma.loanApplication.findUnique({
            where: { id: parseInt(id) },
            include: { participants: { include: { entity: true } } }
        });

        if (!application) return res.status(404).json({ error: 'Application not found' });

        const applicant = application.participants.find(p => p.role === 'APPLICANT')?.entity;
        if (!applicant || !applicant.phoneNumber) {
            return res.status(400).json({ error: 'Applicant phone number not found.' });
        }

        const { code, hash, expiresAt } = otpService.generateOTP();

        await prisma.loanApplication.update({
            where: { id: parseInt(id) },
            data: {
                otpHash: hash,
                otpExpiresAt: expiresAt
            }
        });

        // Mock send
        await otpService.sendSMS(applicant.phoneNumber, code);

        res.json({
            message: 'OTP sent successfully.',
            expiresAt,
            // In a real app we NEVER return the code, but for mock/test convenience we log it
            _mock_code: code
        });
    } catch (error) {
        console.error('OTP Request Error:', error);
        res.status(500).json({ error: 'Failed to request OTP' });
    }
});

/**
 * 7. OTP Verification
 * Verifies the OTP and transitions status.
 */
router.post('/:id/otp-verify', async (req, res) => {
    try {
        const { id } = req.params;
        const { code } = req.body;

        const application = await prisma.loanApplication.findUnique({ where: { id: parseInt(id) } });

        if (!application || !application.otpHash) {
            return res.status(404).json({ error: 'Application or OTP session not found' });
        }

        const isValid = otpService.verifyOTP(code, application.otpHash, application.otpExpiresAt);

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        await prisma.loanApplication.update({
            where: { id: parseInt(id) },
            data: { status: 'OTP_VERIFIED' }
        });

        res.json({ message: 'OTP verified successfully. Please provide disbursement details.', status: 'OTP_VERIFIED' });
    } catch (error) {
        console.error('OTP Verification Error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

module.exports = router;
