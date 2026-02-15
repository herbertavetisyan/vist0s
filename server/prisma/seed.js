const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Seed Stages
    const stageNames = [
        'Entities', 'Documents', 'Credit Bureau', 'Salary Source', 'Scoring', 'Manual Review', 'Approval', 'Disbursement'
    ];

    // Create Stages if not exist
    const stagesMap = {};
    for (const [index, name] of stageNames.entries()) {
        const stage = await prisma.stage.upsert({
            where: { name },
            update: {},
            create: { name, description: `${name} stage` },
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
            stages: ['Entities', 'Documents', 'Credit Bureau', 'Scoring', 'Manual Review', 'Approval', 'Disbursement'],
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
            stages: ['Entities', 'Documents', 'Credit Bureau', 'Salary Source', 'Manual Review', 'Approval', 'Disbursement'],
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

    // Seed Admin User
    const admin = await prisma.user.upsert({
        where: { email: 'admin@vistos.com' },
        update: {},
        create: {
            email: 'admin@vistos.com',
            name: 'Sim Admin',
            password: 'hashed_password_here',
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
