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

        let processedData = {};

        if (isPartnerPayload) {
            // Map Partner Payload
            const { applicationId, loanRequest, applicant, kyc, questionnaire } = data;

            // Extract verified data from KYC if applicant fields are empty
            const idVer = kyc?.data?.id_verifications?.[0] || {};
            const extraFields = idVer.extra_fields || {};

            const fName = applicant.firstName || idVer.first_name || 'Unknown';
            const lName = applicant.lastName || idVer.last_name || 'Unknown';
            const fNameNonLatin = applicant.firstNameNonLatin || extraFields.first_name_non_latin || '';
            const lNameNonLatin = applicant.lastNameNonLatin || extraFields.last_name_non_latin || '';
            const bDateStr = applicant.birthDate || idVer.date_of_birth;
            const genderValue = applicant.gender || idVer.gender;

            // Map product type (PERSONAL -> 1 (Personal Loan), MORTGAGE -> 2 (Mortgage))
            let productTypeId = 1;
            if (loanRequest.type === 'MORTGAGE') productTypeId = 2;

            processedData = {
                externalId: applicationId,
                amountRequested: loanRequest.amount,
                currency: loanRequest.currency || 'AMD',
                termRequested: loanRequest.term,
                productTypeId: productTypeId,
                nationalId: applicant.ssn, // Mapping SSN to National ID
                phone: applicant.mobileNumber,
                email: applicant.email,
                firstName: fName,
                lastName: lName,
                firstNameNonLatin: fNameNonLatin,
                lastNameNonLatin: lNameNonLatin,
                dateOfBirth: bDateStr ? new Date(bDateStr) : null,
                gender: genderValue,
                kycData: kyc, // Store full KYC object
                applicationData: questionnaire // Store full questionnaire
            };

            // Validate Date if provided
            if (processedData.dateOfBirth && isNaN(processedData.dateOfBirth.getTime())) {
                console.warn(`[LoanService] Invalid birthDate format: ${bDateStr}`);
                processedData.dateOfBirth = null;
            }
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

            // 1. Create or Find Entity
            let entity = await tx.entity.findUnique({ where: { nationalId } });

            if (entity) {
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
                    productTypeId: productTypeId,
                    enrichmentRequestId: enrichmentRequest.id,
                    partnerId: partnerId,
                    externalId: externalId,
                    applicationData: applicationData,
                    currency: processedData.currency
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
