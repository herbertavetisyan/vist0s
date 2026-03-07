import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // 1. Create a Primary Tenant
    const tenant = await prisma.tenant.create({
        data: {
            name: 'VistOS Demo Bank',
        }
    });

    // 2. Create standard Roles
    const adminRole = await prisma.role.create({
        data: {
            tenantId: tenant.id,
            name: 'Administrator',
            permissions: ['*'] // full access
        }
    });

    const agentRole = await prisma.role.create({
        data: {
            tenantId: tenant.id,
            name: 'Agent',
            permissions: ['applications:read', 'applications:write']
        }
    });

    // 3. Create Admin User
    const passwordHash = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.create({
        data: {
            tenantId: tenant.id,
            roleId: adminRole.id,
            email: 'admin@vist.am',
            passwordHash,
            firstName: 'System',
            lastName: 'Administrator',
        }
    });

    // 4. Create Loan Type
    const loanType = await prisma.loanType.create({
        data: {
            tenantId: tenant.id,
            productId: '001',
            name: 'Standard Consumer Loan',
            currency: 'AMD',
            minAmount: 50000,
            maxAmount: 5000000,
            minTenure: 3,
            maxTenure: 48,
            allowedApplicantTypes: ['PERSON'], // Basic consumer loan only allows PERSON
            allowedRoles: ['APPLICANT', 'GUARANTOR'],
            requiredDocuments: [
                { id: 'doc-1', name: 'Passport Scan', required: true, description: 'High quality color scan of passport or ID card' },
                { id: 'doc-2', name: 'Income Statement', required: false, description: 'Optional proof of supplementary income' }
            ],
            stagesConfig: [
                { name: 'ENTITIES', required: true },
                { name: 'ID_VERIFICATION', required: true },
                { name: 'INCOME_VERIFICATION', required: true },
                { name: 'CREDIT_BUREAU', required: true },
                { name: 'SCORING', required: true },
                { name: 'MANUAL_REVIEW', required: false },
                { name: 'CONTRACTS', required: true },
                { name: 'DISBURSEMENT', required: true }
            ]
        }
    });

    // 5. Create a Partner
    const partner = await prisma.partner.create({
        data: {
            tenantId: tenant.id,
            name: 'StoreFront Electronics',
            apiKey: 'sk_test_partner_123456789'
        }
    });

    console.log('Seed completed successfully!');
    console.log('Tenant:', tenant.id);
    console.log('Admin Email: admin@vist.am (admin123)');
    console.log('Partner API Key:', partner.apiKey);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
