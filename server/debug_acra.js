const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const application = await prisma.loanApplication.findUnique({
        where: { id: 17 },
        include: {
            enrichmentRequest: {
                include: {
                    results: {
                        where: { serviceName: 'acra' }
                    }
                }
            }
        }
    });

    if (!application) {
        console.log('Application 17 not found');
        return;
    }

    const acraResult = application.enrichmentRequest?.results[0];
    if (!acraResult) {
        console.log('ACRA result not found for application 17');
        return;
    }

    console.log(JSON.stringify(acraResult.responseData, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
