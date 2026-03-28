import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createLoanType = async (req, res) => {
    try {
        const {
            name, productId, currency, minAmount, maxAmount, minTenure, maxTenure,
            allowedApplicantTypes, allowedRoles, requiredDocuments, stagesConfig,
            scoreConfig, isPartnerOriginated
        } = req.body;
        const tenantId = req.tenantId;

        const loanType = await prisma.loanType.create({
            data: {
                name,
                productId,
                currency: currency || 'AMD',
                minAmount,
                maxAmount,
                minTenure,
                maxTenure,
                allowedApplicantTypes: allowedApplicantTypes || ['PERSON'],
                allowedRoles: allowedRoles || ['APPLICANT'],
                requiredDocuments: requiredDocuments || [],
                stagesConfig, // JSON array of stages
                scoreConfig,  // JSON config for scoring parameters
                isPartnerOriginated: isPartnerOriginated || false,
                tenantId,
            }
        });

        res.status(201).json(loanType);
    } catch (error) {
        console.error('Failed to create loan type:', error);
        res.status(500).json({ error: 'Failed to create loan type' });
    }
};

export const getLoanTypes = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const loanTypes = await prisma.loanType.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(loanTypes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch loan types' });
    }
};

export const updateLoanType = async (req, res) => {
    console.log(`[DEBUG] updateLoanType (generic PUT /:id) called for ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const updateData = { ...req.body };

        // Prevent updating read-only/relational fields that Prisma rejects
        delete updateData.id;
        delete updateData.tenantId;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        delete updateData.applications;

        const loanType = await prisma.loanType.findFirst({
            where: { id, tenantId }
        });

        if (!loanType) {
            return res.status(404).json({ error: 'Loan type not found' });
        }

        const updatedLoanType = await prisma.loanType.update({
            where: { id },
            data: updateData
        });

        res.json(updatedLoanType);
    } catch (error) {
        console.error('Failed to update loan type:', error);
        res.status(500).json({ error: 'Failed to update loan type' });
    }
};

export const deleteLoanType = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;

        const loanType = await prisma.loanType.findFirst({
            where: { id, tenantId }
        });

        if (!loanType) {
            return res.status(404).json({ error: 'Loan type not found' });
        }

        const deletedLoanType = await prisma.loanType.delete({
            where: { id }
        });

        res.json(deletedLoanType);
    } catch (error) {
        // If it fails, it's likely because existing applications are tied to it (foreign key constraint)
        res.status(409).json({ error: 'Cannot delete loan type. It may be linked to existing applications.' });
    }
};

export const updateScoreConfig = async (req, res) => {
    console.log(`[DEBUG] updateScoreConfig called for ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const scoreConfig = req.body;

        const loanType = await prisma.loanType.findFirst({
            where: { id, tenantId }
        });

        if (!loanType) {
            console.log(`[DEBUG] Loan type not found for ID: ${id}`);
            return res.status(404).json({ error: 'Loan type not found' });
        }

        const updatedLoanType = await prisma.loanType.update({
            where: { id },
            data: { scoreConfig }
        });

        res.json(updatedLoanType);
    } catch (error) {
        console.error('Failed to update score config:', error.message || error);
        res.status(500).json({ error: error.message || 'Failed to update score config' });
    }
};
