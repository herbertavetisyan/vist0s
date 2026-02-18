const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Seed Stages
    const stageNames = [
        'Entities', 'ID Verification', 'Income Verification', 'Credit Bureau', 'Scoring', 'Contracts', 'Disbursement'
    ];

    // Create Stages if not exist
    const stagesMap = {};
    for (const [index, name] of stageNames.entries()) {
        let description = `${name} stage`;
        if (name === 'ID Verification') description = 'ID verification (EKENG)';
        if (name === 'Income Verification') description = 'Income Verification (NORQ)';
        if (name === 'Credit Bureau') description = 'Credit Bureau (ACRA)';
        if (name === 'Scoring') description = 'Scoring (DMS)';
        if (name === 'Disbursement') description = 'Disbursement (Armsoft)';

        const stage = await prisma.stage.upsert({
            where: { name },
            update: { description },
            create: { name, description },
        });
        stagesMap[name] = stage;
    }

    // Seed Product Types
    const products = [
        {
            name: 'Personal Loan',
            currency: 'AMD',
            minAmount: 100000,
            maxAmount: 5000000,
            interestRate: 12.5,
            minTenure: 12,
            maxTenure: 60,
            stages: ['Entities', 'ID Verification', 'Income Verification', 'Credit Bureau', 'Scoring', 'Contracts', 'Disbursement'],
            entities: [{ type: 'INDIVIDUAL', role: 'APPLICANT', required: true }]
        },
        {
            name: 'Mortgage',
            currency: 'USD',
            minAmount: 20000,
            maxAmount: 200000,
            interestRate: 8.5,
            minTenure: 60,
            maxTenure: 240,
            stages: ['Entities', 'ID Verification', 'Income Verification', 'Credit Bureau', 'Scoring', 'Contracts', 'Disbursement'],
            entities: [{ type: 'INDIVIDUAL', role: 'APPLICANT', required: true }, { type: 'INDIVIDUAL', role: 'CO_APPLICANT', required: false }]
        }
    ];

    for (const p of products) {
        const product = await prisma.productType.upsert({
            where: { name: p.name },
            update: {
                currency: p.currency,
                minAmount: p.minAmount,
                maxAmount: p.maxAmount,
                minTenure: p.minTenure,
                maxTenure: p.maxTenure,
                interestRate: p.interestRate
            },
            create: {
                name: p.name,
                description: `${p.name} description`,
                currency: p.currency,
                minAmount: p.minAmount,
                maxAmount: p.maxAmount,
                minTenure: p.minTenure,
                maxTenure: p.maxTenure,
                interestRate: p.interestRate
            },
        });

        // Link Stages
        // First clean up existing links to avoid duplicates/conflicts during seed re-run
        await prisma.productStage.deleteMany({ where: { productTypeId: product.id } });

        let order = 1;
        for (const stageName of p.stages) {
            if (stagesMap[stageName]) {
                await prisma.productStage.create({
                    data: {
                        productTypeId: product.id,
                        stageId: stagesMap[stageName].id,
                        order: order++,
                        isRequired: true
                    }
                });
            }
        }

        // Link Entities
        await prisma.productEntity.deleteMany({ where: { productTypeId: product.id } });
        for (const entityConfig of p.entities) {
            await prisma.productEntity.create({
                data: {
                    productTypeId: product.id,
                    entityType: entityConfig.type,
                    role: entityConfig.role,
                    isRequired: entityConfig.required
                }
            });
        }
    }

    // Seed Admin Users
    const bcrypt = require('bcryptjs');
    const hashedHeboPassword = await bcrypt.hash('1111', 10);
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);

    const hebo = await prisma.user.upsert({
        where: { email: 'hebo@mail.com' },
        update: { password: hashedHeboPassword },
        create: {
            email: 'hebo@mail.com',
            name: 'Hebo',
            password: hashedHeboPassword,
            role: 'ADMIN',
        },
    });

    const admin = await prisma.user.upsert({
        where: { email: 'admin@vistos.com' },
        update: { password: hashedAdminPassword },
        create: {
            email: 'admin@vistos.com',
            name: 'Sim Admin',
            password: hashedAdminPassword,
            role: 'ADMIN',
        },
    });

    console.log("Seeding completed.");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
