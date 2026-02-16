const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Workflow Service
 * Manages stage transitions based on ProductType configuration.
 */
class WorkflowService {
    /**
     * Map a Stage name to an ApplicationStatus enum value
     * @param {string} stageName 
     * @returns {string} ApplicationStatus
     */
    mapStageToStatus(stageName) {
        const mapping = {
            'Entities': 'ENRICHING',
            'Documents': 'ENRICHING',
            'Credit Bureau': 'ENRICHING',
            'Salary Source': 'ENRICHING',
            'Scoring': 'OFFER_READY',
            'Manual Review': 'MANUAL_REVIEW',
            'Internal Signing': 'SIGNING',
            'Approval': 'APPROVED',
            'Disbursement': 'DISBURSED'
        };
        return mapping[stageName] || 'SUBMITTED';
    }

    /**
     * Determine the next stage for an application
     * @param {number} applicationId 
     * @returns {object|null} The next ProductStage or null if complete
     */
    async getNextStage(applicationId) {
        const application = await prisma.loanApplication.findUnique({
            where: { id: applicationId },
            include: {
                productType: {
                    include: {
                        allowedStages: {
                            orderBy: { order: 'asc' }
                        }
                    }
                }
            }
        });

        if (!application) throw new Error('Application not found');

        const stages = application.productType.allowedStages;
        if (!application.currentStageId) {
            return stages[0];
        }

        const currentIndex = stages.findIndex(ps => ps.stageId === application.currentStageId);
        if (currentIndex === -1 || currentIndex === stages.length - 1) {
            return null; // Lifecycle complete
        }

        return stages[currentIndex + 1];
    }

    /**
     * Transition an application to its next stage
     * @param {number} applicationId 
     */
    async transitionToNext(applicationId) {
        const nextProductStage = await this.getNextStage(applicationId);

        if (!nextProductStage) {
            // No more stages, likely already disbursed or terminal
            return;
        }

        // Fetch stage name to map to status
        const stage = await prisma.stage.findUnique({
            where: { id: nextProductStage.stageId }
        });

        const newStatus = this.mapStageToStatus(stage.name);

        await prisma.loanApplication.update({
            where: { id: applicationId },
            data: {
                currentStageId: nextProductStage.stageId,
                status: newStatus
            }
        });

        await prisma.log.create({
            data: {
                action: 'STAGE_TRANSITION',
                details: `Transitioned to stage: ${stage.name} (Status: ${newStatus})`,
                loanApplicationId: applicationId
            }
        });
    }
}

module.exports = new WorkflowService();
