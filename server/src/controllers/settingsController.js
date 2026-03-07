import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

// Get all settings for the tenant
export const getSettings = async (req, res) => {
    try {
        const { tenantId } = req.user;

        const settings = await prisma.setting.findMany({
            where: { tenantId }
        });

        // Convert array of objects [{key: 'dmsUrl', value: 'http...'}, ...] to a clean object {dmsUrl: 'http...', dmsKey: '...'}
        const settingsObj = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        res.json(settingsObj);
    } catch (error) {
        logger.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

// Update or create settings for the tenant
export const updateSettings = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const updates = req.body; // e.g., { dmsUrl: "https://...", dmsKey: "secret" }

        const upsertPromises = Object.entries(updates).map(([key, value]) => {
            return prisma.setting.upsert({
                where: {
                    tenantId_key: {
                        tenantId: tenantId,
                        key: key
                    }
                },
                update: { value: String(value) },
                create: {
                    tenantId,
                    key,
                    value: String(value)
                }
            });
        });

        await prisma.$transaction(upsertPromises);

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        logger.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};
