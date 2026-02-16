const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { executeEnrichment } = require('../services/enrichmentService');
const documentService = require('../services/documentService');
const otpService = require('../services/otpService');
const workflowService = require('../services/workflowService');

/**
 * @swagger
 * tags:
 *   name: Applications
 *   description: Loan Application lifecycle management
 */

/**
 * @swagger
 * /api/applications:
 *   post:
 *     summary: Submit a new loan application
 *     tags: [Applications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nationalId, phone, email, amountRequested, termRequested]
 *             properties:
 *               nationalId: { type: string, example: "AB1234567" }
 *               phone: { type: string, example: "+37499123456" }
 *               email: { type: string, example: "test@example.com" }
 *               amountRequested: { type: number, example: 500000 }
 *               termRequested: { type: integer, example: 24 }
 *               productTypeId: { type: integer, example: 1 }
 *     responses:
 *       202:
 *         description: Application submitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoanResponse'
 */
router.post('/', async (req, res) => {
    try {
        const loanService = require('../services/loanService');
        const loanApplication = await loanService.createApplication(req.body);

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
 * @swagger
 * /api/applications/{id}/offer:
 *   get:
 *     summary: Get loan offer/status
 *     tags: [Applications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Loan application details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoanApplication'
 */
router.get('/:id/offer', async (req, res) => {
    const { id } = req.params;
    const application = await prisma.loanApplication.findUnique({
        where: { id: parseInt(id) },
        include: {
            productType: {
                include: {
                    allowedStages: {
                        include: { stage: true },
                        orderBy: { order: 'asc' }
                    }
                }
            },
            currentStage: true
        }
    });

    if (!application) return res.status(404).json({ error: 'Application not found' });

    res.json({
        applicationId: application.id,
        status: application.status,
        approvedLimit: application.approvedLimit,
        approvedTerm: application.approvedTerm,
        interestRate: application.interestRate,
        currency: application.currency,
        currentStage: application.currentStage,
        stages: application.productType.allowedStages.map(ps => ({
            id: ps.stage.id,
            name: ps.stage.name,
            order: ps.order
        }))
    });
});

/**
 * @swagger
 * /api/applications/{id}/selection:
 *   post:
 *     summary: Select loan offer
 *     tags: [Applications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SelectionRequest'
 *     responses:
 *       200:
 *         description: Offer selected
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

    await workflowService.transitionToNext(parseInt(id));

    res.json({ message: 'Offer selected successfully. Proceed to signing.', status: 'OFFER_SELECTED' });
});

/**
 * @swagger
 * /api/applications/{id}/disbursement:
 *   post:
 *     summary: finalize disbursement details
 *     tags: [Applications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bankName, accountNumber]
 *             properties:
 *               bankName: { type: string, example: "AmeriaBank" }
 *               accountNumber: { type: string, example: "AM1234567890" }
 *     responses:
 *       200:
 *         description: Loan disbursed
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
 * @swagger
 * /api/applications/{id}/agreement:
 *   get:
 *     summary: Get loan agreement PDF
 *     tags: [Applications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: PDF file
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
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
 * @swagger
 * /api/applications/{id}/signing:
 *   post:
 *     summary: Sign loan agreement
 *     tags: [Applications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Document signed
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

        await workflowService.transitionToNext(parseInt(id));

        res.json({ message: 'Document signed successfully. Proceed to next stage.', status: 'SIGNING_COMPLETE' });
    } catch (error) {
        console.error('Signing Error:', error);
        res.status(500).json({ error: 'Failed to sign document' });
    }
});

/**
 * @swagger
 * /api/applications/{id}/otp-request:
 *   post:
 *     summary: Request verification OTP
 *     tags: [Applications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: OTP sent
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
 * @swagger
 * /api/applications/{id}/otp-verify:
 *   post:
 *     summary: Verify OTP
 *     tags: [Applications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: OTP verified
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

        await workflowService.transitionToNext(parseInt(id));

        res.json({ message: 'OTP verified successfully. Please provide disbursement details.', status: 'OTP_VERIFIED' });
    } catch (error) {
        console.error('OTP Verification Error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

/**
 * @swagger
 * /api/applications/{id}/approve:
 *   post:
 *     summary: Approve loan application (Manual Review)
 *     tags: [Applications]
 */
router.post('/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const application = await prisma.loanApplication.findUnique({ where: { id: parseInt(id) } });

        if (!application) return res.status(404).json({ error: 'Application not found' });
        if (application.status !== 'MANUAL_REVIEW') {
            return res.status(400).json({ error: 'Application not in manual review.' });
        }

        await workflowService.transitionToNext(parseInt(id));
        res.json({ message: 'Application approved.', status: 'APPROVED' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to approve application' });
    }
});

/**
 * @swagger
 * /api/applications/{id}/reject:
 *   post:
 *     summary: Reject loan application
 *     tags: [Applications]
 */
router.post('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.loanApplication.update({
            where: { id: parseInt(id) },
            data: { status: 'REJECTED' }
        });
        res.json({ message: 'Application rejected.', status: 'REJECTED' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reject application' });
    }
});

module.exports = router;
