import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const partnerMiddleware = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'Unauthorized: No API Key provided' });
    }

    try {
        const partner = await prisma.partner.findUnique({
            where: { apiKey }
        });

        if (!partner || !partner.isActive) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or inactive API Key' });
        }

        req.partner = partner; // Contains id, tenantId
        req.partnerId = partner.id;
        next();
    } catch (error) {
        console.error("Partner Auth Error", error)
        return res.status(500).json({ error: 'Internal Server Error validating API Key' });
    }
};
