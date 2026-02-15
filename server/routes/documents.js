const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const documentService = require('../services/documentService');

/**
 * 4. Get Documents
 * Fetches the agreement text/buffer for signing.
 */
router.get('/:id/documents/:docType', async (req, res) => {
    const { id, docType } = req.params;
    const application = await prisma.loanApplication.findUnique({ where: { id: parseInt(id) } });

    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Generate PDF (mock)
    const buffer = await documentService.generateAgreement(application, docType);

    // For demo purposes, we'll return text/plain if requested or application/pdf
    res.setHeader('Content-Type', 'text/plain');
    res.send(buffer);
});

/**
 * 5. Sign Document
 * Client "signs" the document.
 */
router.post('/:id/documents/:docType/sign', async (req, res) => {
    const { id, docType } = req.params;

    await documentService.signDocument(id, docType);

    // Update status if both docs signed (simplified)
    const newStatus = docType === 'agreement-2' ? 'SIGNING_COMPLETE' : 'SIGNING';

    await prisma.loanApplication.update({
        where: { id: parseInt(id) },
        data: { status: newStatus }
    });

    res.json({ message: `Document ${docType} signed.`, status: newStatus });
});

module.exports = router;
