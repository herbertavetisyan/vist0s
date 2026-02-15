const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const otpService = require('../services/otpService');

/**
 * 6. Send OTP
 * Triggers OTP generation and delivery to the applicant.
 */
router.post('/:id/send', async (req, res) => {
    const { id } = req.params;

    const application = await prisma.loanApplication.findUnique({
        where: { id: parseInt(id) },
        include: { participants: { include: { entity: true } } }
    });

    if (!application) return res.status(404).json({ error: 'Application not found' });

    const applicant = application.participants.find(p => p.role === 'APPLICANT');
    if (!applicant) return res.status(400).json({ error: 'Applicant entity not found' });

    // Generate OTP
    const { code, hash, expiresAt } = otpService.generateOTP();

    // Store in DB
    await prisma.loanApplication.update({
        where: { id: parseInt(id) },
        data: {
            otpHash: hash,
            otpExpiresAt: expiresAt
        }
    });

    // Send via SMS (mock)
    await otpService.sendSMS(applicant.entity.phoneNumber, code);

    res.json({ message: 'OTP sent successfully.', status: application.status });
});

/**
 * 7. Verify OTP
 * Validates the code provided by the client.
 */
router.post('/:id/verify', async (req, res) => {
    const { id } = req.params;
    const { otp } = req.body;

    const application = await prisma.loanApplication.findUnique({ where: { id: parseInt(id) } });
    if (!application) return res.status(404).json({ error: 'Application not found' });

    const isValid = otpService.verifyOTP(otp, application.otpHash, application.otpExpiresAt);

    if (!isValid) {
        return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    // Update status
    await prisma.loanApplication.update({
        where: { id: parseInt(id) },
        data: { status: 'OTP_VERIFIED' }
    });

    res.json({ message: 'OTP verified successfully.', status: 'OTP_VERIFIED' });
});

module.exports = router;
