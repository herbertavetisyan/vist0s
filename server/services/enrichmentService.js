const axios = require('axios');

/**
 * Enrichment Service
 * Handles sequential calls to external services: NORQ → EKENG → ACRA → DMS
 */

// Service configurations (will be loaded from environment variables)
const SERVICES = {
    NORQ: {
        name: 'norq',
        url: process.env.NORQ_API_URL || 'https://api.norq.example.com',
        apiKey: process.env.NORQ_API_KEY || 'mock_norq_key',
        timeout: 10000,
        sequenceOrder: 1
    },
    EKENG: {
        name: 'ekeng',
        url: process.env.EKENG_API_URL || 'https://api.ekeng.example.com',
        apiKey: process.env.EKENG_API_KEY || 'mock_ekeng_key',
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

        // For DMS, include previous responses
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
        norq: {
            creditScore: 720,
            creditHistory: {
                totalLoans: 3,
                activeLoans: 1,
                closedLoans: 2,
                totalDebt: 2500000,
                paymentHistory: 'GOOD',
                lastUpdate: new Date().toISOString()
            },
            riskLevel: 'LOW'
        },
        ekeng: {
            employmentStatus: 'EMPLOYED',
            employer: {
                name: 'Tech Solutions LLC',
                taxId: '01234567',
                industry: 'IT'
            },
            salary: {
                amount: 850000,
                currency: 'AMD',
                verified: true,
                lastPaymentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
            },
            employmentDuration: '3 years 2 months'
        },
        acra: {
            companyRegistration: {
                registered: false,
                message: 'Individual applicant - no company registration'
            },
            directorships: [],
            businessActivity: 'NONE'
        },
        dms: {
            documentVerification: {
                idCard: {
                    verified: true,
                    issueDate: '2020-05-15',
                    expiryDate: '2030-05-15',
                    status: 'VALID'
                },
                addressProof: {
                    verified: false,
                    required: true
                }
            },
            aggregatedRiskScore: 75,
            recommendation: 'APPROVE',
            conditions: ['Provide address proof document'],
            // Include data from previous services
            enrichmentSummary: previousResponses ? {
                creditScore: previousResponses.norq?.creditScore,
                employmentVerified: previousResponses.ekeng?.salary?.verified,
                companyRegistered: previousResponses.acra?.companyRegistration?.registered
            } : null
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
 * Execute enrichment process sequentially
 * Flow: NORQ → EKENG → ACRA → DMS (with collected responses)
 */
async function executeEnrichment(params, prisma, enrichmentRequestId) {
    const results = [];
    const collectedResponses = {};

    // Service sequence
    const sequence = ['NORQ', 'EKENG', 'ACRA', 'DMS'];

    for (const serviceName of sequence) {
        const service = SERVICES[serviceName];

        try {
            // Update enrichment request status
            await prisma.enrichmentRequest.update({
                where: { id: enrichmentRequestId },
                data: { status: 'IN_PROGRESS' }
            });

            // For DMS, pass collected responses from previous services
            const previousResponses = serviceName === 'DMS' ? collectedResponses : null;

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
    const enrichmentRequest = await prisma.enrichmentRequest.findUnique({
        where: { id: enrichmentRequestId },
        include: { loanApplication: true }
    });

    if (enrichmentRequest.loanApplication) {
        const applicationId = enrichmentRequest.loanApplication.id;

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
