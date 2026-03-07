import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createLoanType = async (req, res) => {
    try {
        const {
            name, productId, currency, minAmount, maxAmount, minTenure, maxTenure,
            allowedApplicantTypes, allowedRoles, requiredDocuments, stagesConfig,
            isPartnerOriginated
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
    try {
        const { id } = req.params;
        const tenantId = req.tenantId;
        const updateData = req.body;

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
