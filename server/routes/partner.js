const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const loanService = require('../services/loanService');

// Middleware to verify API Key
const verifyApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'API Key is required' });

    const partner = await prisma.partner.findUnique({ where: { apiKey } });
    if (!partner || !partner.isActive) return res.status(403).json({ error: 'Invalid or inactive API Key' });

    req.partner = partner;
    next();
};

/**
 * @swagger
 * /api/partner/applications:
 *   post:
 *     summary: External partner application submission
 *     tags: [Partner]
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         schema: { type: string }
 */
router.post('/applications', verifyApiKey, async (req, res) => {
    try {
        const loanApplication = await loanService.createApplication(req.body, req.partner.id);
        res.status(201).json({
            applicationId: loanApplication.id,
            status: loanApplication.status,
            message: 'Partner application received'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process partner application' });
    }
});

module.exports = router;
