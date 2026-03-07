import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    try {
        const partner = await prisma.partner.findFirst({
            where: { isActive: true }
        });
        if (!partner) throw new Error("No partner found!");

        let loanType = await prisma.loanType.findFirst({
            where: { isPartnerOriginated: true }
        });
        
        let targetLoanTypeId = loanType?.id;

        if (!targetLoanTypeId) {
            console.log("Creating partner loan type...");
            const newLt = await prisma.loanType.create({
                data: {
                    tenantId: partner.tenantId,
                    name: 'API Partner Loan',
                    currency: 'AMD',
                    minAmount: 100000,
                    maxAmount: 5000000,
                    minTenure: 3,
                    maxTenure: 12,
                    isPartnerOriginated: true,
                    stagesConfig: [
                        { name: "ID_VERIFICATION", required: true },
                        { name: "MANUAL_REVIEW", required: true }
                    ]
                }
            });
            targetLoanTypeId = newLt.id;
        }

        console.log(`Using LoanType: ${targetLoanTypeId}`);
        console.log(`Using Partner API Key: ${partner.apiKey}`);

        const form = new FormData();
        form.append('loanTypeId', targetLoanTypeId);
        form.append('requestedAmount', '250000');
        form.append('requestedTenure', '6');
        form.append('firstName', 'API');
        form.append('lastName', 'User');
        form.append('ssn', '44445555');
        form.append('phone', '+37499112233');
        form.append('email', 'api@test.com');
        form.append('livenessData', JSON.stringify({ match: 0.99, vendor: 'BiometricAi' }));

        console.log("Sending POST to /api/external/applications...");
        const res = await fetch('http://localhost:5000/api/external/applications', {
            method: 'POST',
            headers: {
                'x-api-key': partner.apiKey
            },
            body: form
        });

        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Body:", text);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
