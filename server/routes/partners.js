const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

// Helper to generate secure keys
const generateApiKey = () => {
    return 'pk_' + crypto.randomBytes(24).toString('hex');
};

const generateAppId = () => {
    return 'app_' + crypto.randomBytes(8).toString('hex');
};

/**
 * @swagger
 * /api/admin/partners:
 *   get:
 *     summary: List all partners
 *     tags: [Admin]
 */
router.get('/', async (req, res) => {
    try {
        const partners = await prisma.partner.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(partners);
    } catch (error) {
        console.error('List Partners Error:', error);
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
});

/**
 * @swagger
 * /api/admin/partners:
 *   post:
 *     summary: Create a new partner
 *     tags: [Admin]
 */
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Partner name is required' });
        }

        const partner = await prisma.partner.create({
            data: {
                name,
                appId: generateAppId(),
                apiKey: generateApiKey(),
                type: 'AGENT' // Default type for now
            }
        });

        res.status(201).json(partner);
    } catch (error) {
        console.error('Create Partner Error:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Partner name already exists' });
        }
        res.status(500).json({ error: 'Failed to create partner' });
    }
});

/**
 * @swagger
 * /api/admin/partners/{id}/rotate-key:
 *   put:
 *     summary: Rotate API Key for a partner
 *     tags: [Admin]
 */
router.put('/:id/rotate-key', async (req, res) => {
    try {
        const { id } = req.params;
        const newApiKey = generateApiKey();

        const partner = await prisma.partner.update({
            where: { id: parseInt(id) },
            data: { apiKey: newApiKey }
        });

        res.json({
            message: 'API Key rotated successfully',
            apiKey: partner.apiKey
        });
    } catch (error) {
        console.error('Rotate Key Error:', error);
        res.status(500).json({ error: 'Failed to rotate API key' });
    }
});

/**
 * @swagger
 * /api/admin/partners/{id}:
 *   delete:
 *     summary: Revoke partner access (Delete)
 *     tags: [Admin]
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.partner.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Partner deleted successfully' });
    } catch (error) {
        console.error('Delete Partner Error:', error);
        res.status(500).json({ error: 'Failed to delete partner' });
    }
});

module.exports = router;
