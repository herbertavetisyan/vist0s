import { PrismaClient } from '@prisma/client';
import * as mockIntegrations from '../services/integrationMockService.js';

const prisma = new PrismaClient();

export const createApplicant = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const {
            type, role, firstName, lastName, ssn, passport,
            companyName, taxId, phone, email, address
        } = req.body;

        // Basic validation depending on type
        if (type !== 'LEGAL_ENTITY' && (!firstName || !lastName)) {
            return res.status(400).json({ error: 'First name and Last name are required for persons' });
        }
        if (type === 'LEGAL_ENTITY' && (!companyName || !taxId)) {
            return res.status(400).json({ error: 'Company Name and Tax ID are required for Legal Entities' });
        }

        const applicant = await prisma.applicant.create({
            data: {
                tenantId,
                type: type || 'PERSON',
                role: role || 'APPLICANT',
                firstName,
                lastName,
                ssn,
                passport,
                companyName,
                taxId,
                phone,
                email,
                address
            }
        });

        res.status(201).json(applicant);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create applicant' });
    }
};

export const lookupApplicant = async (req, res) => {
    try {
        const { ssn, passport, loanTypeId } = req.query;

        if (!ssn && !passport) {
            return res.status(400).json({ error: 'Please provide either SSN or Passport number' });
        }

        let productId = null;
        if (loanTypeId) {
            const loanType = await prisma.loanType.findUnique({ where: { id: loanTypeId } });
            if (loanType) {
                productId = loanType.productId;
            }
        }

        // We use the integration mock directly to simulate fetching verified Ekeng ID data.
        // If productId is '001' and no valid match is found, this will safely throw the "Not Found" error to bubble up.
        const result = await mockIntegrations.mockEkengVerify('John', 'Doe', passport, ssn, productId);

        res.json(result);
    } catch (error) {
        console.error('Lookup failed', error);
        res.status(500).json({ error: error.message || 'Failed to lookup applicant data' });
    }
};

export const getApplicants = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const applicants = await prisma.applicant.findMany({
            where: { tenantId }
        });
        res.json(applicants);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch applicants' });
    }
};
