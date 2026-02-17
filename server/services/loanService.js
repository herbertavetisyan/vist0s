const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { executeEnrichment } = require('./enrichmentService');
const workflowService = require('./workflowService');

class LoanService {
    /**
     * Create a new loan application
     * Supports both simple internal payload and complex external partner payload.
     * @param {object} applicationData 
     * @param {number|null} partnerId 
     */
    async createApplication(data, partnerId = null) {
        // Detect payload type
        const isPartnerPayload = !!data.loanRequest;
        console.log('LoanService: Processing application. Partner payload?', isPartnerPayload);

        let processedData = {};

        if (isPartnerPayload) {
            // Map Partner Payload
            const { applicationId, loanRequest, applicant, kyc, questionnaire } = data;

            // Map product type (Mock logic for now)
            let productTypeId = 1; // Default
            if (loanRequest.type === 'MORTGAGE') productTypeId = 2;

            processedData = {
                externalId: applicationId,
                amountRequested: loanRequest.amount,
                currency: loanRequest.currency,
                termRequested: loanRequest.term,
                productTypeId: productTypeId,
                nationalId: applicant.ssn, // Mapping SSN to National ID
                phone: applicant.mobileNumber,
                email: applicant.email,
                firstName: applicant.firstName,
                lastName: applicant.lastName,
                firstNameNonLatin: applicant.firstNameNonLatin,
                lastNameNonLatin: applicant.lastNameNonLatin,
                dateOfBirth: new Date(applicant.birthDate), // Parse date string
                gender: applicant.gender,
                kycData: kyc, // Store full KYC object
                applicationData: questionnaire // Store full questionnaire
            };
        } else {
            // Internal Payload (keep existing logic)
            processedData = {
                ...data,
                productTypeId: parseInt(data.productTypeId) || 1
            };
        }

        const {
            nationalId, phone, email, amountRequested, termRequested, productTypeId,
            firstName, lastName, firstNameNonLatin, lastNameNonLatin, gender, dateOfBirth,
            kycData, applicationData, externalId
        } = processedData;

        // Perform Transaction
        return await prisma.$transaction(async (tx) => {
            console.log('LoanService: Starting transaction for', nationalId);

            // 1. Create or Find Entity
            let entity = await tx.entity.findUnique({ where: { nationalId } });
            console.log('LoanService: Entity found?', !!entity);

            if (entity) {
                console.log('LoanService: Updating entity...');
                entity = await tx.entity.update({
                    where: { id: entity.id },
                    data: {
                        firstName: firstName || entity.firstName,
                        lastName: lastName || entity.lastName,
                        phoneNumber: phone || entity.phoneNumber,
                        email: email || entity.email,
                        firstNameNonLatin: firstNameNonLatin || entity.firstNameNonLatin,
                        lastNameNonLatin: lastNameNonLatin || entity.lastNameNonLatin,
                        gender: gender || entity.gender,
                        dateOfBirth: dateOfBirth || entity.dateOfBirth,
                        kycData: kycData || entity.kycData
                    }
                });
            } else {
                console.log('LoanService: Creating entity...');
                entity = await tx.entity.create({
                    data: {
                        nationalId,
                        firstName: firstName || 'Unknown',
                        lastName: lastName || 'Unknown',
                        type: 'INDIVIDUAL',
                        phoneNumber: phone,
                        email,
                        firstNameNonLatin,
                        lastNameNonLatin,
                        gender,
                        dateOfBirth,
                        kycData
                    }
                });
            }
            console.log('LoanService: Entity processed:', entity.id);

            // 2. Create Enrichment Request
            console.log('LoanService: Creating enrichment request...');
            const enrichmentRequest = await tx.enrichmentRequest.create({
                data: { nationalId, phone, email, status: 'PENDING' }
            });
            console.log('LoanService: Enrichment req created:', enrichmentRequest.id);

            // 3. Create Loan Application
            console.log('LoanService: Creating loan application...');
            const loanApplication = await tx.loanApplication.create({
                data: {
                    amountRequested,
                    termRequested,
                    status: 'ENRICHING',
                    productTypeId: productTypeId,
                    enrichmentRequestId: enrichmentRequest.id,
                    partnerId: partnerId,
                    externalId: externalId,
                    applicationData: applicationData,
                    currency: processedData.currency
                }
            });
            console.log('LoanService: Loan application created:', loanApplication.id);

            // 4. Link Entity as Applicant
            console.log('LoanService: Linking applicant...');
            await tx.loanParticipant.create({
                data: {
                    loanApplicationId: loanApplication.id,
                    entityId: entity.id,
                    role: 'APPLICANT'
                }
            });

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
