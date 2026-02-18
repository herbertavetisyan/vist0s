const axios = require('axios');
const workflowService = require('./workflowService');

/**
 * Enrichment Service
 * Handles sequential calls to external services: NORQ → EKENG → ACRA → DMS
 */

// Service configurations (will be loaded from environment variables)
const SERVICES = {
    EKENG: {
        name: 'ekeng',
        url: process.env.EKENG_API_URL || 'https://api.ekeng.example.com',
        apiKey: process.env.EKENG_API_KEY || 'mock_ekeng_key',
        timeout: 10000,
        sequenceOrder: 1
    },
    NORQ: {
        name: 'norq',
        url: process.env.NORQ_API_URL || 'https://api.norq.example.com',
        apiKey: process.env.NORQ_API_KEY || 'mock_norq_key',
        timeout: 10000,
        sequenceOrder: 2
    },
    ACRA: {
        name: 'acra',
        url: process.env.ACRA_API_URL || 'https://api.acra.example.com',
        apiKey: process.env.ACRA_API_KEY || 'mock_acra_key',
        timeout: 10000,
        sequenceOrder: 3
    },
    DMS: {
        name: 'dms',
        url: process.env.DMS_API_URL || 'https://api.dms.example.com',
        apiKey: process.env.DMS_API_KEY || 'mock_dms_key',
        timeout: 15000,
        sequenceOrder: 4
    }
};

/**
 * Mock mode - returns simulated responses for development
 */
const MOCK_MODE = process.env.ENRICHMENT_MOCK_MODE === 'true' || true;

/**
 * Call a single external service
 */
async function callService(serviceName, params, previousResponses = null) {
    const service = SERVICES[serviceName.toUpperCase()];
    if (!service) {
        throw new Error(`Unknown service: ${serviceName}`);
    }

    const startTime = Date.now();

    try {
        // In mock mode, return simulated data
        if (MOCK_MODE) {
            return await mockServiceCall(service, params, previousResponses);
        }

        // Real API call
        const payload = {
            nationalId: params.nationalId,
            phone: params.phone,
            email: params.email
        };

        // For ACRA, include verified identity data from EKENG if available
        if (serviceName.toUpperCase() === 'ACRA' && previousResponses?.ekeng) {
            const privateData = previousResponses.ekeng.argPrivateData;
            payload.passportNumber = privateData.Passport || privateData.IdCard;
            payload.firstName = privateData.Firstname;
            payload.lastName = privateData.Lastname;
            console.log(`[Enrichment] ACRA Request with verified identity:`, payload.passportNumber);
        }

        // For DMS, include all previous responses
        if (serviceName.toUpperCase() === 'DMS' && previousResponses) {
            payload.enrichmentData = previousResponses;
            console.log(`[Enrichment] DMS Request Payload including collection:`, JSON.stringify(payload, null, 2));
        }

        const response = await axios.post(
            `${service.url}/enrich`,
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${service.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: service.timeout
            }
        );

        return {
            success: true,
            data: response.data,
            responseTime: Date.now() - startTime
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            errorType: error.code || 'UNKNOWN_ERROR',
            responseTime: Date.now() - startTime
        };
    }
}

/**
 * Mock service call for development/testing
 */
async function mockServiceCall(service, params, previousResponses) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Simulate occasional failures (10% chance)
    if (Math.random() < 0.1) {
        throw new Error(`${service.name.toUpperCase()} service temporarily unavailable`);
    }

    const mockData = {
        ekeng: {
            "xmlns": "http://norq.am/dxchange/2013",
            "GetUserData_v2021Result": "true",
            "argCurrenDate": new Date().toISOString(),
            "argPrivateData": {
                "Firstname": "ԱՆԴՐԱՆԻԿ",
                "Lastname": "ԵՐԻՑՅԱՆ",
                "Birthdate": "1992-02-07T00:00:00",
                "Passport": "AO0448726",
                "IdCard": "016580946",
                "Soccard": params.nationalId || "1702920925",
                "Gender": "1"
            },
            "message": "Identity data retrieved from EKENG"
        },
        norq: {
            "xmlns": "http://norq.am/dxchange/2013",
            "GetUserData_v2021Result": "true",
            "argWorkData": {
                "WorkData_v2018": [
                    {
                        "WorkName": "«ՇԻՐԱԿԱՑՈՒ ՃԵՄԱՐԱՆ» ՄԻՋԱԶԳԱՅԻՆ ԳԻՏԱԿՐԹԱԿԱՆ ՀԱՄԱԼԻՐ",
                        "Salary": "165297",
                        "EntryDate": "2025-01-01T00:00:00"
                    }
                ]
            },
            "message": "Income data retrieved from NORQ"
        },
        acra: {
            "type": "Bank_Application_LOAN_PP_Answer",
            "ReqID": "2512512916717616313716220",
            "AppNumber": "60660",
            "DateTime": new Date().toLocaleString('en-GB'),
            "Response": "OK",
            "SID": "c7tf0oihe5g8qhjcqitecjme1a",
            "ReportType": "02",
            "PARTICIPIENT": {
                "id": "1",
                "ThePresenceData": "1",
                "KindBorrower": "1",
                "RequestTarget": "1",
                "UsageRange": "1",
                "ReportNumber": "CAC-RPS-2-2026-147994",
                "FirstName": previousResponses?.ekeng?.argPrivateData?.Firstname || "ՄԱՐԻԱՄ",
                "LastName": previousResponses?.ekeng?.argPrivateData?.Lastname || "ԳՐԻԳՈՐՅԱՆ",
                "PassportNumber": previousResponses?.ekeng?.argPrivateData?.Passport || "BA2681064",
                "IdCardNumber": previousResponses?.ekeng?.argPrivateData?.IdCard || "006059836",
                "DateofBirth": previousResponses?.ekeng?.argPrivateData?.Birthdate?.split('T')[0] || "11-12-1983",
                "SocCardNumber": previousResponses?.ekeng?.argPrivateData?.Soccard || "6112830973",
                "Address": "Ք.ԱՐՏԱՇԱՏ ԻՍԱԿՈՎԻ/...",
                "Residence": "Ռեզիդենտ",
                "TotalLiabilitiesLoan": {
                    "Amount": "5019621",
                    "Currency": "AMD"
                },
                "TotalLiabilitiesGuarantee": {
                    "Amount": "0",
                    "Currency": "AMD"
                },
                "SelfInquiryQuantity30": "0",
                "SelfInquiryQuantity": "0",
                "Loans": {
                    "Loan": [
                        {
                            "CreditID": "ACTIVE_001",
                            "SourceName": "HSBC Armenia",
                            "Currency": "AMD",
                            "ActualCreditStart": "15-05-2023",
                            "CreditStatus": "գործող",
                            "ContractAmount": "2500000",
                            "AmountDue": "1200000",
                            "TheLoanClass": "Ստանդարտ",
                            "CreditType": "Վարկ"
                        },
                        {
                            "CreditID": "9604089932",
                            "SourceName": "Ինեկոբանկ ՓԲԸ",
                            "Currency": "AMD",
                            "ActualCreditStart": "01-04-2019",
                            "CreditStatus": "մարված",
                            "ContractAmount": "475000",
                            "TheLoanClass": "Ստանդարտ",
                            "CreditType": "Վարկ"
                        },
                        {
                            "CreditID": "10109564847",
                            "SourceName": "ԱԿԲԱ ԲԱՆԿ ԲԲԸ",
                            "Currency": "AMD",
                            "ActualCreditStart": "21-02-2020",
                            "CreditStatus": "մարված",
                            "ContractAmount": "103900",
                            "TheLoanClass": "Ստանդարտ",
                            "CreditType": "Ֆակտորինգ"
                        }
                    ]
                },
                "Inquiries": {
                    "Inquiry": [
                        {
                            "InquiryDate": "10-02-2026",
                            "SourceName": "Ամերիաբանկ ՓԲԸ",
                            "InquiryReason": "Վարկի հարցում"
                        },
                        {
                            "InquiryDate": "05-01-2026",
                            "SourceName": "Վիվասել-ՄՏՍ",
                            "InquiryReason": "Ապառիկի հարցում"
                        }
                    ]
                }
            },
            // Metadata for internal scoring
            creditScore: 720,
            riskLevel: 'LOW',
            message: 'Detailed credit report retrieved from ACRA'
        },
        dms: {
            aggregatedRiskScore: 75,
            recommendation: 'APPROVE',
            decisions: { limit: 2000000, term: 36, rate: 14.5 },
            enrichmentSummary: previousResponses ? {
                identityVerified: true,
                incomeVerified: true,
                creditScore: previousResponses.acra?.creditScore
            } : null,
            message: 'Scoring calculated via DMS engine'
        }
    };

    if (service.name === 'dms') {
        console.log(`[Mock Enrichment] DMS received collection:`, Object.keys(previousResponses || {}).join(', '));
    }

    return {
        success: true,
        data: mockData[service.name] || { message: 'Mock data not available' },
        responseTime: 500 + Math.random() * 1000
    };
}

/**
 * Compare API ID data with Application Entity data
 */
function verifyIdentity(apiData, entity) {
    const privateData = apiData?.argPrivateData;
    if (!privateData) return { success: false, reason: 'No private data in API response' };

    // Clean and compare names (Unicode aware)
    const apiFirst = (privateData.Firstname || '').trim().toUpperCase();
    const apiLast = (privateData.Lastname || '').trim().toUpperCase();
    const dbFirst = (entity.firstNameNonLatin || '').trim().toUpperCase();
    const dbLast = (entity.lastNameNonLatin || '').trim().toUpperCase();

    // Check birthdate (ignoring time and timezone shifts)
    const apiDob = privateData.Birthdate ? new Date(privateData.Birthdate).toLocaleDateString('en-CA') : null; // YYYY-MM-DD
    const dbDob = entity.dateOfBirth ? new Date(entity.dateOfBirth).toLocaleDateString('en-CA') : null;

    const matches = {
        firstName: apiFirst === dbFirst,
        lastName: apiLast === dbLast,
        birthDate: apiDob === dbDob
    };

    const isVerified = matches.firstName && matches.lastName && matches.birthDate;

    return {
        success: isVerified,
        matches,
        details: {
            api: { firstName: apiFirst, lastName: apiLast, dob: apiDob },
            db: { firstName: dbFirst, lastName: dbLast, dob: dbDob }
        }
    };
}

/**
 * Execute enrichment process sequentially
 * Flow: NORQ → EKENG → ACRA → DMS (with collected responses)
 */
async function executeEnrichment(params, prisma, enrichmentRequestId) {
    const results = [];
    const collectedResponses = {};

    // Get the loan application linked to this enrichment request
    const enrichmentRequest = await prisma.enrichmentRequest.findUnique({
        where: { id: enrichmentRequestId },
        include: {
            loanApplication: {
                include: {
                    participants: {
                        include: { entity: true }
                    }
                }
            }
        }
    });

    const application = enrichmentRequest?.loanApplication;
    const applicationId = application?.id;
    const applicant = application?.participants.find(p => p.role === 'APPLICANT')?.entity;

    // Service sequence
    const sequence = ['EKENG', 'NORQ', 'ACRA', 'DMS'];

    for (const serviceName of sequence) {
        if (applicationId) {
            await workflowService.transitionToNext(applicationId);
        }
        const service = SERVICES[serviceName];

        try {
            // Update enrichment request status
            await prisma.enrichmentRequest.update({
                where: { id: enrichmentRequestId },
                data: { status: 'IN_PROGRESS' }
            });

            // For ACRA and DMS, pass collected responses from previous services
            const previousResponses = (serviceName === 'ACRA' || serviceName === 'DMS') ? collectedResponses : null;

            // Call the service
            const result = await callService(serviceName, params, previousResponses);

            // Store result in database
            const dbResult = await prisma.enrichmentResult.create({
                data: {
                    enrichmentRequestId,
                    serviceName: service.name,
                    status: result.success ? 'success' : 'failed',
                    requestedAt: new Date(),
                    respondedAt: new Date(),
                    responseData: result.data || null,
                    errorMessage: result.error || null,
                    sequenceOrder: service.sequenceOrder
                }
            });

            results.push(dbResult);

            // Collect successful responses for DMS
            if (result.success && serviceName !== 'DMS') {
                collectedResponses[service.name] = result.data;
            }

            // --- SPECIFIC STAGE LOGIC: ID VERIFICATION ---
            if (serviceName === 'EKENG' && result.success && applicant) {
                const idVerification = verifyIdentity(result.data, applicant);

                await prisma.log.create({
                    data: {
                        action: 'IDENTITY_VERIFICATION',
                        details: JSON.stringify(idVerification),
                        loanApplicationId: applicationId
                    }
                });

                if (!idVerification.success) {
                    console.log(`[Enrichment] Identity verification failed for Application #${applicationId}`);
                    // You could potentially stop the loop here or mark as partial
                    // For now we continue but log the failure
                } else {
                    console.log(`[Enrichment] Identity verified successfully for Application #${applicationId}`);
                }
            }

            // Optional: decide whether to continue on failure
            // For now, we continue even if a service fails

        } catch (error) {
            // Log error and continue
            console.error(`Error calling ${serviceName}:`, error);

            await prisma.enrichmentResult.create({
                data: {
                    enrichmentRequestId,
                    serviceName: service.name,
                    status: 'failed',
                    requestedAt: new Date(),
                    respondedAt: new Date(),
                    errorMessage: error.message,
                    sequenceOrder: service.sequenceOrder
                }
            });
        }
    }

    // Determine final status
    const successCount = results.filter(r => r.status === 'success').length;
    let finalStatus = 'COMPLETED';

    if (successCount === 0) {
        finalStatus = 'FAILED';
    } else if (successCount < sequence.length) {
        finalStatus = 'PARTIAL';
    }

    // Update enrichment request with final status
    await prisma.enrichmentRequest.update({
        where: { id: enrichmentRequestId },
        data: { status: finalStatus }
    });

    // --- INTEGRATION WITH LOAN APPLICATION & SCORING ---
    const appRequest = await prisma.enrichmentRequest.findUnique({
        where: { id: enrichmentRequestId },
        include: { loanApplication: true }
    });

    if (appRequest.loanApplication) {
        const applicationId = appRequest.loanApplication.id;

        if (finalStatus === 'FAILED') {
            await prisma.loanApplication.update({
                where: { id: applicationId },
                data: { status: 'REJECTED' }
            });
        } else {
            // Calculate scoring based on collected data
            const scoringService = require('./scoringService');
            const scoringResult = await scoringService.calculateOffer(collectedResponses, {
                amountRequested: enrichmentRequest.loanApplication.amountRequested,
                termRequested: enrichmentRequest.loanApplication.termRequested
            });

            if (scoringResult.rejected) {
                await prisma.loanApplication.update({
                    where: { id: applicationId },
                    data: { status: 'REJECTED' }
                });
            } else {
                await prisma.loanApplication.update({
                    where: { id: applicationId },
                    data: {
                        status: 'OFFER_READY',
                        approvedLimit: scoringResult.approvedLimit,
                        approvedTerm: scoringResult.approvedTerm,
                        interestRate: scoringResult.interestRate
                    }
                });

                // Transition to Contracts stage (from Scoring)
                await workflowService.transitionToNext(applicationId);
            }
        }
    }

    return {
        enrichmentRequestId,
        status: finalStatus,
        results,
        summary: {
            total: sequence.length,
            successful: successCount,
            failed: sequence.length - successCount
        }
    };
}

module.exports = {
    executeEnrichment,
    callService,
    SERVICES
};
