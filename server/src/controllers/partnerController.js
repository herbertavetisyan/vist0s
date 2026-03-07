import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const createPartner = async (req, res) => {
    try {
        const { name } = req.body;
        const tenantId = req.tenantId; // From tenantMiddleware

        if (!name) return res.status(400).json({ error: 'Partner name is required' });

        const apiKey = `sk_partner_${crypto.randomBytes(16).toString('hex')}`;

        const partner = await prisma.partner.create({
            data: {
                name,
                apiKey,
                tenantId,
            }
        });

        res.status(201).json(partner);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create partner' });
    }
};

export const getPartners = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const partners = await prisma.partner.findMany({
            where: { tenantId }
        });
        res.json(partners);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
};

export const terminatePartner = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const partner = await prisma.partner.findFirst({
            where: { id, tenantId }
        });

        if (!partner) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        const terminatedPartner = await prisma.partner.update({
            where: { id },
            data: { isActive: false }
        });

        res.json(terminatedPartner);
    } catch (error) {
        res.status(500).json({ error: 'Failed to terminate partner' });
    }
};
