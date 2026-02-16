const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { executeEnrichment } = require('./enrichmentService');
const workflowService = require('./workflowService');

class LoanService {
    /**
     * Create a new loan application
     * @param {object} applicationData 
     * @param {number|null} partnerId 
     */
    async createApplication(applicationData, partnerId = null) {
        const { nationalId, phone, email, amountRequested, termRequested, productTypeId } = applicationData;

        return await prisma.$transaction(async (tx) => {
            // 1. Create or Find Entity
            let entity = await tx.entity.findUnique({ where: { nationalId } });
            if (!entity) {
                entity = await tx.entity.create({
                    data: { nationalId, firstName: 'Applicant', lastName: 'User', type: 'INDIVIDUAL', phoneNumber: phone, email }
                });
            }

            // 2. Create Enrichment Request
            const enrichmentRequest = await tx.enrichmentRequest.create({
                data: { nationalId, phone, email, status: 'PENDING' }
            });

            // 3. Create Loan Application
            const loanApplication = await tx.loanApplication.create({
                data: {
                    amountRequested,
                    termRequested,
                    status: 'ENRICHING',
                    productTypeId: parseInt(productTypeId) || 1,
                    enrichmentRequestId: enrichmentRequest.id,
                    partnerId: partnerId
                }
            });

            // 4. Link Entity as Applicant
            await tx.loanParticipant.create({
                data: {
                    loanApplicationId: loanApplication.id,
                    entityId: entity.id,
                    role: 'APPLICANT'
                }
            });

            // 5. Start enrichment in background (after tx)
            // Note: We can't easily do this inside tx if it's async, 
            // but we can return the request details to start it outside.

            return { loanApplication, enrichmentRequest, entity };
        }).then(async (result) => {
            // Start enrichment in background
            executeEnrichment({ nationalId, phone, email }, prisma, result.enrichmentRequest.id);

            // Initialize first stage
            await workflowService.transitionToNext(result.loanApplication.id);

            return result.loanApplication;
        });
    }
}

module.exports = new LoanService();
