import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const deepEqual = (obj1, obj2) => {
    if (obj1 === obj2) return true;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) return false;
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;
    for (const key of keys1) {
        if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) return false;
    }
    return true;
};
import logger, { redactSensitiveData } from '../utils/logger.js';
import * as mockIntegrations from '../services/integrationMockService.js';
import * as dmsService from '../services/dmsService.js';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads/kyc');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // e.g., ssn-timestamp-passport.jpg
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

export const uploadKyc = multer({ storage: storage });

export const createApplicationFromPartner = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const partnerId = req.partnerId; // Injected by partnerMiddleware

        // Log incoming request
        logger.info('Incoming Partner API Request', {
            partnerId,
            tenantId,
            path: req.originalUrl,
            method: req.method,
            ip: req.ip,
            payload: redactSensitiveData(req.body)
        });

        // Form data fields
        const {
            productId, requestedAmount, requestedTenure,
            firstName, lastName, ssn, passport, phone, email, address,
            passportScan, selfieData, livenessData
        } = req.body;

        // Validate required fields: passport is mandatory, ssn is optional
        if (!productId || !passport || !phone || !email) {
            logger.warn('Partner API Request Missing Fields', { partnerId, providedKeys: Object.keys(req.body) });
            return res.status(400).json({ error: 'Missing required fields: productId, passport, phone, email' });
        }

        // Validate Loan Type exists by productId
        const loanType = await prisma.loanType.findUnique({
            where: {
                tenantId_productId: {
                    tenantId,
                    productId
                }
            }
        });

        if (!loanType) {
            return res.status(400).json({ error: 'Invalid productId provided' });
        }

        const loanTypeId = loanType.id;

        // Build KYC data from source links
        let kycData = {
            originalRequest: req.body // Store the full partner request for audit/display
        };
        if (passportScan) {
            kycData.passportScanUrl = passportScan;
        }
        if (selfieData) {
            kycData.selfieUrl = selfieData;
        }
        // Liveness data at the bottom
        let extractedIdentity = {};
        if (livenessData) {
            try {
                const parsedLiveness = typeof livenessData === 'string' ? JSON.parse(livenessData) : livenessData;
                kycData.livenessData = parsedLiveness;

                // Extract truth data from Didit KYC payload if available
                const diditData = parsedLiveness?.kyc?.data;
                if (diditData?.id_verifications && diditData.id_verifications.length > 0) {
                    const idv = diditData.id_verifications[0];
                    const docNumber = idv.document_number || idv.personal_number;
                    const docType = idv.document_type || '';

                    extractedIdentity = {
                        firstName: idv.first_name || idv.extra_fields?.first_name_non_latin,
                        lastName: idv.last_name || idv.extra_fields?.last_name_non_latin,
                        passport: docNumber,
                        ssn: idv.extra_fields?.social_security_number
                    };
                }
            } catch (e) {
                kycData.livenessData = { rawData: livenessData };
            }
        }

        // Merge extracted identity with form data (liveness KYC data takes priority if it exists)
        const finalFirstName = extractedIdentity.firstName || firstName;
        const finalLastName = extractedIdentity.lastName || lastName;
        const finalPassport = extractedIdentity.passport || passport;
        const finalSsn = extractedIdentity.ssn || ssn;

        // Validating inferred document types
        if (finalPassport) {
            const isIdCard = /^\d{9}$/.test(finalPassport); // ID Card or Biometric
            const isPassport = /^[A-Za-z]{2}\d{7}$/.test(finalPassport); // Passport

            if (!isIdCard && !isPassport) {
                return res.status(400).json({ error: "Invalid passport format. Must be an Identity Card (9 digits) or Passport (2 letters, 7 digits)." });
            }
        }

        if (finalSsn && !/^\d{10}$/.test(finalSsn)) {
            return res.status(400).json({ error: "Invalid SSN format. Must be exactly 10 digits." });
        }

        // Ekeng Identity Verification Check
        let ekengResult = null;
        try {
            ekengResult = await mockIntegrations.mockEkengVerify(
                finalFirstName, finalLastName, finalPassport, finalSsn, loanType.productId
            );
            // Store the Ekeng result in kycData for audit trail
            kycData.ekengVerification = ekengResult;
        } catch (ekengError) {
            logger.warn('Ekeng verification failed for Partner API request', {
                partnerId,
                passport: finalPassport,
                ssn: finalSsn,
                error: ekengError.message
            });
            return res.status(400).json({ error: ekengError.message });
        }

        // 1. Applicant Lookup & Versioning
        // Try finding by SSN first
        let existingApplicant = await prisma.applicant.findFirst({
            where: { tenantId, ssn: finalSsn },
            orderBy: { version: 'desc' }
        });

        let activeApplicantId;

        if (existingApplicant) {
            // Check if any core contact or identity data changed that requires a new version snapshot
            const dataChanged =
                existingApplicant.phone !== phone ||
                existingApplicant.email !== email ||
                existingApplicant.address !== address ||
                existingApplicant.lastName !== finalLastName ||
                existingApplicant.firstName !== finalFirstName ||
                existingApplicant.passport !== finalPassport ||
                existingApplicant.ssn !== finalSsn;

            if (dataChanged) {
                // Create a new version
                const newVersion = await prisma.applicant.create({
                    data: {
                        tenantId,
                        type: 'PERSON',
                        role: 'APPLICANT',
                        firstName: finalFirstName,
                        lastName: finalLastName,
                        passport: finalPassport,
                        ssn: finalSsn,
                        phone,
                        email,
                        address: address || existingApplicant.address,
                        version: existingApplicant.version + 1,
                        previousId: existingApplicant.id
                    }
                });
                activeApplicantId = newVersion.id;
            } else {
                activeApplicantId = existingApplicant.id;
            }
        } else {
            // Create brand new Applicant
            const newApplicant = await prisma.applicant.create({
                data: {
                    tenantId,
                    type: 'PERSON',
                    role: 'APPLICANT',
                    firstName: finalFirstName,
                    lastName: finalLastName,
                    passport: finalPassport,
                    ssn: finalSsn,
                    phone,
                    email,
                    address,
                    version: 1
                }
            });
            activeApplicantId = newApplicant.id;
        }

        // 2. Application Creation
        let application = await prisma.application.create({
            data: {
                tenantId,
                applicantId: activeApplicantId,
                loanTypeId,
                partnerId, // Link to the Partner API Key that sent this
                requestedAmount: requestedAmount ? parseFloat(requestedAmount) : 0,
                requestedTenure: requestedTenure ? parseInt(requestedTenure) : 0,
                status: 'PROCESSING',
                currentStage: 'ID_VERIFICATION', // Start at the beginning for Admin to monitor
                kycData // Store the source links and liveness data
            },
            include: {
                applicant: true
            }
        });

        // 3. Auto-Progression Pipeline (NORQ -> ACRA -> DMS)
        let approvedAmount = null;
        let approvedTenure = application.requestedTenure;
        let assignedRate = null;
        let scoringResult = null;

        try {
            // Include loanType to make sure the productId is accessible
            const applicantRec = application.applicant;

            // 3a. Income Verification (NORQ)
            const incomeResult = await mockIntegrations.mockNorqIncome(applicantRec.ssn, loanType.productId);

            // 3b. Credit Bureau (ACRA)
            const creditResult = await mockIntegrations.mockAcraCredit(applicantRec.firstName, applicantRec.lastName, applicantRec.passport);

            // Save intermediate data to DB before scoring
            application = await prisma.application.update({
                where: { id: application.id },
                data: {
                    idVerificationData: ekengResult, // Save Ekeng data we fetched earlier
                    incomeVerificationData: incomeResult,
                    creditBureauData: creditResult,
                    currentStage: 'SCORING'
                }
            });

            // 3c. Decision Engine (DMS Scoring)
            const scoringResultRaw = await dmsService.scoreApplication(application, applicantRec);
            scoringResult = scoringResultRaw?.success && scoringResultRaw?.response ? scoringResultRaw.response : scoringResultRaw;

            if (scoringResult?.Limit > 0) {
                approvedAmount = scoringResult.Limit;

                if (scoringResult?.Offers && scoringResult.Offers.length > 0) {
                    approvedTenure = scoringResult.Offers[0].Duration || approvedTenure;
                    assignedRate = scoringResult.Offers[0].Rate || assignedRate;
                }
            } else if (scoringResult?.Offers && scoringResult.Offers.length > 0) {
                // Ignore offers with 0 limit (rejections)
                const validOffers = scoringResult.Offers.filter(o => o.Limit > 0);
                if (validOffers.length > 0) {
                    approvedAmount = validOffers[0].Limit;
                    approvedTenure = validOffers[0].Duration;
                    assignedRate = validOffers[0].Rate;
                }
            }

            // Save final scoring decision
            application = await prisma.application.update({
                where: { id: application.id },
                data: {
                    scoringData: scoringResult,
                    approvedAmount,
                    approvedTenure,
                    assignedRate,
                    currentStage: 'MANUAL_REVIEW'
                }
            });

        } catch (pipelineError) {
            logger.error('Auto-progression pipeline failed for Partner application', {
                partnerId,
                applicationId: application.id,
                error: pipelineError.message
            });
            // Application remains in the stage where it failed, but we still return 201 created.
        }

        // 4. Respond to Partner
        logger.info('Application processed successfully via Partner API', {
            partnerId,
            applicationId: application.id,
            applicantId: activeApplicantId,
            approvedAmount
        });

        const responsePayload = {
            message: 'Application created successfully via Partner API',
            applicationId: application.id,
            status: application.status,
            currentStage: application.currentStage
        };

        // Return the exact DMS scoring result if it exists so the partner can see the full offer details
        if (scoringResult) {
            responsePayload.offer = {
                Result: scoringResult.Result,
                appID: scoringResult.appID,
                Offers: scoringResult.Offers || []
            };
        } else if (approvedAmount && approvedAmount > 0) {
            // Fallback
            responsePayload.offer = {
                limit: approvedAmount,
                duration: approvedTenure,
                rate: assignedRate
            };
        }

        res.status(201).json(responsePayload);

    } catch (error) {
        next(error); // Pass to the new Winston-backed error handler middleware
    }
};

export const recalculateApplicationFromPartner = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const partnerId = req.partnerId;
        const applicationId = req.params.id;

        logger.info('Incoming Partner API Request: Recalculate Application', {
            partnerId,
            tenantId,
            applicationId,
            path: req.originalUrl,
            method: req.method
        });

        // 1. Fetch application and verify it belongs to this partner
        let application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: {
                applicant: true,
                loanType: true
            }
        });

        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        if (application.partnerId !== partnerId || application.tenantId !== tenantId) {
            return res.status(403).json({ error: 'Forbidden: Application does not belong to this partner' });
        }

        // Prevent recalculation if it's already in a final state
        const nonRecalculableStages = ['CONTRACTS', 'DISBURSEMENT', 'COMPLETED', 'REJECTED'];
        if (nonRecalculableStages.includes(application.currentStage) || ['REJECTED', 'APPROVED', 'COMPLETED'].includes(application.status)) {
            return res.status(400).json({ error: `Cannot recalculate application in stage ${application.currentStage} with status ${application.status}` });
        }

        const { ExecutedAmount } = req.body;
        if (ExecutedAmount === undefined || isNaN(ExecutedAmount) || ExecutedAmount <= 0) {
            return res.status(400).json({ error: 'Valid positive ExecutedAmount field is required in request body' });
        }

        // Apply new requested amount temporarily for scoring payload
        const amount = parseFloat(ExecutedAmount);
        application.requestedAmount = amount;

        const applicantRec = application.applicant;

        let scoringResult = null;
        let approvedAmount = null;
        let approvedTenure = application.requestedTenure;
        let assignedRate = null;

        try {
            // 2. Hit DMS scoring with the newly requested amount using the RECALCULATE type
            const scoringResultRaw = await dmsService.scoreApplication(application, applicantRec, 'RECALCULATE', { ExecutedAmount: amount });
            console.log("Recalculate DMS Result:", JSON.stringify(scoringResultRaw, null, 2));
            scoringResult = scoringResultRaw?.success && scoringResultRaw?.response ? scoringResultRaw.response : scoringResultRaw;

            let maxOfferLimit = application.requestedAmount;

            if (scoringResult?.EffectiveAnnualRate) {
                // If the recalculate schema returned the new calculate schema
                assignedRate = parseFloat(scoringResult.EffectiveAnnualRate);
                approvedAmount = amount;
            } else {
                // Fallback for full object structure if we receive one
                maxOfferLimit = 0;
                if (scoringResult?.Limit > 0) {
                    maxOfferLimit = scoringResult.Limit;

                    if (scoringResult?.Offers && scoringResult.Offers.length > 0) {
                        approvedTenure = scoringResult.Offers[0].Duration || approvedTenure;
                        assignedRate = scoringResult.Offers[0].Rate || assignedRate;
                    }
                } else if (scoringResult?.Offers && scoringResult.Offers.length > 0) {
                    const validOffers = scoringResult.Offers.filter(o => o.Limit > 0);
                    if (validOffers.length > 0) {
                        maxOfferLimit = validOffers[0].Limit;
                        approvedTenure = validOffers[0].Duration;
                        assignedRate = validOffers[0].Rate;
                    }
                }

                if (maxOfferLimit === 0) {
                    return res.status(400).json({ error: 'No valid offer available from scoring for this application.' });
                }

                if (amount > maxOfferLimit) {
                    return res.status(400).json({
                        error: `Requested amount (${amount}) cannot be more than the offer scoring limit (${maxOfferLimit})`
                    });
                }

                approvedAmount = amount;
            }

            const scheduleResult = await mockIntegrations.mockArmsoftSchedule(amount, approvedTenure, assignedRate);

            // Save final decision
            application = await prisma.application.update({
                where: { id: application.id },
                data: {
                    scoringData: scoringResult,
                    approvedAmount,
                    approvedTenure,
                    assignedRate,
                    finalCalculatedAmount: amount,
                    repaymentSchedule: scheduleResult.schedule,
                    currentStage: 'MANUAL_REVIEW',
                    updatedAt: new Date()
                }
            });

        } catch (pipelineError) {
            logger.error('Recalculation failed for Partner application', {
                partnerId,
                applicationId: application.id,
                error: pipelineError.message
            });
            return res.status(500).json({ error: `Recalculation failed: ${pipelineError.message}` });
        }

        const responsePayload = {
            message: 'Application recalculated successfully',
            applicationId: application.id,
            status: application.status,
            currentStage: application.currentStage
        };

        if (scoringResult?.EffectiveAnnualRate) {
            responsePayload.offer = {
                EffectiveAnnualRate: scoringResult.EffectiveAnnualRate,
                MonthlyPayment: scoringResult.MonthlyPayment
            };
        } else if (scoringResult) {
            responsePayload.offer = {
                Result: scoringResult.Result,
                appID: scoringResult.appID,
                Offers: scoringResult.Offers || []
            };
        } else if (approvedAmount && approvedAmount > 0) {
            responsePayload.offer = {
                limit: approvedAmount,
                duration: approvedTenure,
                rate: assignedRate
            };
        } else {
            responsePayload.offer = null;
        }

        res.status(200).json(responsePayload);

    } catch (error) {
        next(error);
    }
};

export const submitAccountNumberFromPartner = async (req, res, next) => {
    try {
        const tenantId = req.tenantId;
        const partnerId = req.partnerId;
        const applicationId = req.params.id;
        const { accountNumber, recalculatedResponse } = req.body;

        if (!accountNumber) {
            return res.status(400).json({ error: 'Account number is required' });
        }

        const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: { applicant: true }
        });

        if (!application) return res.status(404).json({ error: 'Application not found' });
        if (application.partnerId !== partnerId || application.tenantId !== tenantId) {
            return res.status(403).json({ error: 'Forbidden: Application does not belong to this partner' });
        }

        // Verify that the critical data values provided in the recalculated response match the actual scoring data in DB.
        // We do a subset match to allow for flexibility if the database scoringData contains extraneous metadata.
        const actualScoringData = application.scoringData || {};
        let isMatch = true;

        if (typeof recalculatedResponse === 'object' && recalculatedResponse !== null) {
            for (const key of Object.keys(recalculatedResponse)) {
                // Use loose string comparison for numbers avoiding strict type mismatches (e.g. 0 vs "0")
                if (String(recalculatedResponse[key]) !== String(actualScoringData[key])) {
                    isMatch = false;
                    break;
                }
            }
        } else {
            isMatch = false;
        }

        if (!isMatch) {
            console.error('Mismatch checking expected vs actual scoringData', JSON.stringify(recalculatedResponse), JSON.stringify(actualScoringData));
            return res.status(400).json({
                error: 'The provided calculation response does not match the last requested offer.',
                expected: actualScoringData,
                received: recalculatedResponse
            });
        }

        const updated = await prisma.application.update({
            where: { id: applicationId },
            data: {
                bankAccountNumber: accountNumber,
                currentStage: 'CONTRACTS'
            },
            include: { applicant: true, loanType: true, partner: true }
        });

        // Generate PDFs in memory
        const { generateLoanContractPdf, generateIndividualPaperPdf } = await import('../utils/pdfGenerator.js');

        const contractPdfBuffer = await generateLoanContractPdf(updated);
        const individualPdfBuffer = await generateIndividualPaperPdf(updated);

        res.json({
            message: 'Account number verified via Partner API and contracts generated successfully.',
            applicationId: updated.id,
            documents: {
                contract: contractPdfBuffer.toString('base64'),
                individualPaper: individualPdfBuffer.toString('base64')
            }
        });

    } catch (error) {
        next(error);
    }
};

