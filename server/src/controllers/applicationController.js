import { PrismaClient } from '@prisma/client';
import * as mockIntegrations from '../services/integrationMockService.js';
import fs from 'fs';
import * as dmsService from '../services/dmsService.js';

const prisma = new PrismaClient();

export const createApplication = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const {
            firstName, lastName, ssn, passport, phone, email, address,
            loanTypeId, requestedAmount, requestedTenure
        } = req.body;

        const partnerId = req.partner?.id || null; // Will exist if called via Partner API

        // Verify loanType belongs to tenant
        const loanType = await prisma.loanType.findFirst({ where: { id: loanTypeId, tenantId } });

        if (!loanType) {
            return res.status(404).json({ error: 'Loan Type not found for this tenant' });
        }

        // Constraints validation
        if (requestedAmount < loanType.minAmount || requestedAmount > loanType.maxAmount) {
            return res.status(400).json({ error: `Amount must be between ${loanType.minAmount} and ${loanType.maxAmount}` });
        }
        if (requestedTenure < loanType.minTenure || requestedTenure > loanType.maxTenure) {
            return res.status(400).json({ error: `Tenure must be between ${loanType.minTenure} and ${loanType.maxTenure} months` });
        }

        // Validating inferred document types
        if (passport) {
            const isIdCard = /^\d{9}$/.test(passport); // ID Card or Biometric
            const isPassport = /^[A-Za-z]{2}\d{7}$/.test(passport); // Passport

            if (!isIdCard && !isPassport) {
                return res.status(400).json({ error: "Invalid passport format. Must be an Identity Card (9 digits) or Passport (2 letters, 7 digits)." });
            }
        }

        if (ssn && !/^\d{10}$/.test(ssn)) {
            return res.status(400).json({ error: "Invalid SSN format. Must be exactly 10 digits." });
        }

        // 1. Ekeng Identity Verification Check (Must pass before creating applicant DB row)
        let ekengResult = null;
        try {
            ekengResult = await mockIntegrations.mockEkengVerify(
                firstName, lastName, passport, ssn, loanType.productId
            );
        } catch (ekengError) {
            console.warn('Ekeng verification failed for internal application request', {
                passport,
                ssn,
                error: ekengError.message
            });
            return res.status(400).json({ error: ekengError.message });
        }

        // 2. Applicant Lookup & Versioning
        let existingApplicant = await prisma.applicant.findFirst({
            where: { tenantId, ssn: ssn },
            orderBy: { version: 'desc' }
        });

        let activeApplicantId;

        if (existingApplicant) {
            const dataChanged =
                existingApplicant.phone !== phone ||
                existingApplicant.email !== email ||
                existingApplicant.address !== address ||
                existingApplicant.lastName !== lastName ||
                existingApplicant.firstName !== firstName ||
                existingApplicant.passport !== passport ||
                existingApplicant.ssn !== ssn;

            if (dataChanged) {
                const newVersion = await prisma.applicant.create({
                    data: {
                        tenantId, type: 'PERSON', role: 'APPLICANT',
                        firstName, lastName, passport, ssn, phone, email,
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
            const newApplicant = await prisma.applicant.create({
                data: {
                    tenantId, type: 'PERSON', role: 'APPLICANT',
                    firstName, lastName, passport, ssn, phone, email, address,
                    version: 1
                }
            });
            activeApplicantId = newApplicant.id;
        }

        // 3. Application Creation
        let application = await prisma.application.create({
            data: {
                tenantId,
                applicantId: activeApplicantId,
                loanTypeId,
                partnerId,
                requestedAmount: requestedAmount ? parseFloat(requestedAmount) : 0,
                requestedTenure: requestedTenure ? parseInt(requestedTenure) : 0,
                status: 'PROCESSING',
                currentStage: 'ID_VERIFICATION',
                idVerificationData: ekengResult // Store Ekeng immediately
            },
            include: {
                applicant: true
            }
        });

        // 4. Auto-Progression Pipeline (NORQ -> ACRA -> DMS)
        let approvedAmount = null;
        let approvedTenure = application.requestedTenure;
        let assignedRate = null;

        try {
            const applicantRec = application.applicant;

            // 4a. Income Verification (NORQ)
            const incomeResult = await mockIntegrations.mockNorqIncome(applicantRec.ssn, loanType.productId);

            // 4b. Credit Bureau (ACRA)
            const creditResult = await mockIntegrations.mockAcraCredit(applicantRec.firstName, applicantRec.lastName, applicantRec.passport);

            // Save intermediate data to DB before scoring
            application = await prisma.application.update({
                where: { id: application.id },
                data: {
                    incomeVerificationData: incomeResult,
                    creditBureauData: creditResult,
                    currentStage: 'SCORING'
                }
            });

            // 4c. Decision Engine (DMS Scoring)
            const scoringResultRaw = await dmsService.scoreApplication(application, applicantRec);
            const scoringResult = scoringResultRaw?.success && scoringResultRaw?.response ? scoringResultRaw.response : scoringResultRaw;

            if (scoringResult?.Limit > 0) {
                approvedAmount = scoringResult.Limit;

                if (scoringResult?.Offers && scoringResult.Offers.length > 0) {
                    approvedTenure = scoringResult.Offers[0].Duration || approvedTenure;
                    assignedRate = scoringResult.Offers[0].Rate || assignedRate;
                }
            } else if (scoringResult?.Offers && scoringResult.Offers.length > 0) {
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
            console.error('Auto-progression pipeline failed internally:', pipelineError.message);
        }

        const responsePayload = {
            ...application,
            message: 'Application created successfully'
        };

        if (approvedAmount && approvedAmount > 0) {
            responsePayload.offer = {
                limit: approvedAmount,
                duration: approvedTenure,
                rate: assignedRate
            };
        }

        res.status(201).json(responsePayload);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create application' });
    }
};

// =======================
// Stage Processors
// =======================
export const processIdVerification = async (req, res) => {
    try {
        const { id } = req.params;
        const application = await prisma.application.findUnique({ where: { id }, include: { applicant: true, loanType: true } });

        if (!application || application.tenantId !== req.tenantId) return res.status(404).json({ error: 'Not found' });
        if (application.currentStage !== 'ID_VERIFICATION') return res.status(400).json({ error: 'Invalid Stage' });

        const result = await mockIntegrations.mockEkengVerify(
            application.applicant.firstName,
            application.applicant.lastName,
            application.applicant.passport,
            application.applicant.ssn,
            application.loanType.productId
        );

        const updated = await prisma.application.update({
            where: { id },
            data: {
                idVerificationData: result,
                currentStage: 'INCOME_VERIFICATION'
            }
        });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'ID Verification Failed' });
    }
};

export const processIncomeVerification = async (req, res) => {
    try {
        const { id } = req.params;
        const application = await prisma.application.findUnique({ where: { id }, include: { applicant: true, loanType: true } });

        if (application.currentStage !== 'INCOME_VERIFICATION') return res.status(400).json({ error: 'Invalid Stage' });

        const result = await mockIntegrations.mockNorqIncome(application.applicant.ssn, application.loanType.productId);

        const updated = await prisma.application.update({
            where: { id },
            data: {
                incomeVerificationData: result,
                currentStage: 'CREDIT_BUREAU'
            }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Income Verification Failed' });
    }
};

export const processCreditBureau = async (req, res) => {
    try {
        const { id } = req.params;
        const application = await prisma.application.findUnique({ where: { id }, include: { applicant: true } });

        if (application.currentStage !== 'CREDIT_BUREAU') return res.status(400).json({ error: 'Invalid Stage' });

        const result = await mockIntegrations.mockAcraCredit(
            application.applicant.firstName,
            application.applicant.lastName,
            application.applicant.passport
        );

        const updated = await prisma.application.update({
            where: { id },
            data: {
                creditBureauData: result,
                currentStage: 'SCORING'
            }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Credit Bureau Check Failed' });
    }
};

export const processScoring = async (req, res) => {
    try {
        const { id } = req.params;
        const application = await prisma.application.findUnique({
            where: { id },
            include: { applicant: true }
        });

        if (application.currentStage !== 'SCORING') return res.status(400).json({ error: 'Invalid Stage' });

        const rawResult = await dmsService.scoreApplication(application, application.applicant);
        const result = rawResult?.success && rawResult?.response ? rawResult.response : rawResult;

        let approvedAmount = null;
        let approvedTenure = application.requestedTenure;
        let assignedRate = null;

        if (result?.Offers && result.Offers.length > 0) {
            const validOffers = result.Offers.filter(o => o.Limit > 0);
            if (validOffers.length > 0) {
                approvedAmount = validOffers[0].Limit;
                approvedTenure = validOffers[0].Duration;
                assignedRate = validOffers[0].Rate;
            }
        } else if (result?.Limit) {
            approvedAmount = result.Limit;
        }

        const updated = await prisma.application.update({
            where: { id },
            data: {
                scoringData: result,
                approvedAmount,
                approvedTenure,
                assignedRate,
                currentStage: 'MANUAL_REVIEW'
            }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Scoring Engine Failed' });
    }
};

export const processManualReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { overrideAmount, overrideTenure, overrideRate, serviceFee, armsoftTemplate, decision, finalAmount, selectedOfferIndex } = req.body;

        // decision: 'APPROVE' or 'REJECT'
        const application = await prisma.application.findUnique({ where: { id } });

        if (application.currentStage !== 'MANUAL_REVIEW') return res.status(400).json({ error: 'Invalid Stage' });

        if (decision === 'REJECT') {
            const updated = await prisma.application.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    currentStage: 'CLOSED',
                    manualReviewData: { decision, timestamp: new Date() }
                }
            });
            return res.json(updated);
        }

        if (decision === 'APPROVE') {
            if (!finalAmount) {
                return res.status(400).json({ error: 'finalAmount is required for approval' });
            }

            // Try to find selected offer to base the rate on, if not overridden
            let finalRate = application.assignedRate;
            if (overrideRate !== undefined && overrideRate !== null) {
                finalRate = Number(overrideRate);
            } else if (selectedOfferIndex !== undefined && application.scoringData?.Offers) {
                const offer = application.scoringData.Offers[selectedOfferIndex];
                if (offer) {
                    finalRate = offer.Rate;
                }
            }

            const updated = await prisma.application.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    currentStage: 'CONTRACTS',
                    approvedAmount: Number(finalAmount),
                    assignedRate: finalRate,
                    serviceFee: serviceFee !== undefined && serviceFee !== null && serviceFee !== '' ? Number(serviceFee) : null,
                    armsoftTemplate: armsoftTemplate || null,
                    manualReviewData: {
                        decision,
                        finalAmount,
                        selectedOfferIndex,
                        overrideRate,
                        serviceFee,
                        armsoftTemplate,
                        timestamp: new Date()
                    }
                }
            });
            return res.json(updated);
        }

        res.status(400).json({ error: 'Invalid decision' });
    } catch (error) {
        res.status(500).json({ error: 'Manual Review Failed' });
    }
};

export const generateContracts = async (req, res) => {
    try {
        const { id } = req.params;
        const application = await prisma.application.findUnique({ where: { id } });

        if (application.currentStage !== 'CONTRACTS') return res.status(400).json({ error: 'Invalid Stage' });

        // Mock contract generation
        const contractData = {
            contractId: `L-CONT-${id.substring(0, 6)}`,
            status: 'GENERATED_WAITING_SIGNATURE',
            generatedAt: new Date(),
            signedAt: null
        };

        const updated = await prisma.application.update({
            where: { id },
            data: {
                contractData,
                currentStage: 'DISBURSEMENT' // Note: A real flow might have a 'WAITING_SIGNATURE' stage
            }
        });

        await mockIntegrations.mockSendEmail('applicant@test.com', 'Your Loan Contracts are ready', 'Please sign your contracts.');

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Contract Generation Failed' });
    }
};

export const processDisbursement = async (req, res) => {
    try {
        const { id } = req.params;
        const application = await prisma.application.findUnique({ where: { id } });

        if (application.currentStage !== 'DISBURSEMENT') return res.status(400).json({ error: 'Invalid Stage' });

        const result = await mockIntegrations.mockArmsoftDisbursement(id, application.approvedAmount);

        const updated = await prisma.application.update({
            where: { id },
            data: {
                disbursementData: result,
                status: 'DISBURSED',
                currentStage: 'COMPLETED'
            }
        });

        await mockIntegrations.mockSendSms('12345678', 'Your loan has been disbursed.');

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Disbursement Failed' });
    }
};

export const recalculateLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const { finalAmount } = req.body;
        const application = await prisma.application.findUnique({ where: { id } });

        if (!application) return res.status(404).json({ error: 'Application not found' });
        if (!['CONTRACTS', 'MANUAL_REVIEW'].includes(application.currentStage)) {
            return res.status(400).json({ error: 'Invalid Stage for recalculation' });
        }

        const amount = Number(finalAmount);
        if (amount > application.approvedAmount) {
            return res.status(400).json({ error: 'Cannot exceed approved amount' });
        }

        const rescoreResult = await mockIntegrations.mockDmsScoring(amount);
        const finalRate = application.assignedRate || rescoreResult.Rate;
        const finalTenure = application.approvedTenure || rescoreResult.Duration;

        const scheduleResult = await mockIntegrations.mockArmsoftSchedule(amount, finalTenure, finalRate);

        const updated = await prisma.application.update({
            where: { id },
            data: {
                finalCalculatedAmount: amount,
                repaymentSchedule: scheduleResult.schedule
            }
        });

        res.json({
            application: updated,
            monthlyPayment: scheduleResult.monthlyPayment,
            totalPayment: scheduleResult.totalPayment,
            schedule: scheduleResult.schedule
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Recalculation Failed' });
    }
};

export const sendOtp = async (req, res) => {
    try {
        const { id } = req.params;
        const application = await prisma.application.findUnique({ where: { id } });

        if (!application) return res.status(404).json({ error: 'Application not found' });

        // Mock a 4-digit OTP
        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

        const updated = await prisma.application.update({
            where: { id },
            data: {
                otpCode: otpCode,
                otpStatus: 'SENT'
            }
        });

        const phone = '12345678'; // In reality: application.applicant.phone
        await mockIntegrations.mockSendSms(phone, `Your VistOS signature OTP is: ${otpCode}`);

        res.json({ message: 'OTP Sent successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send OTP' });
    }
};

export const verifyOtp = async (req, res) => {
    try {
        const { id } = req.params;
        const { otp } = req.body;
        const application = await prisma.application.findUnique({ where: { id } });

        if (!application) return res.status(404).json({ error: 'Application not found' });
        if (application.otpStatus !== 'SENT') return res.status(400).json({ error: 'No OTP was sent' });

        if (application.otpCode === otp || otp === '0000') { // 0000 as universal backdoor for testing
            const updated = await prisma.application.update({
                where: { id },
                data: {
                    otpStatus: 'VERIFIED',
                    contractGenerated: true,
                    currentStage: 'DISBURSEMENT'
                }
            });
            return res.json({ success: true, application: updated });
        } else {
            return res.status(400).json({ error: 'Invalid OTP' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};

export const downloadLoanContract = async (req, res) => {
    try {
        const filePath = '/usr/src/app/static/credit_Contract.pdf';
        if (!fs.existsSync(filePath)) return res.status(404).send('Contract file not found');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="Loan_Contract.pdf"');
        fs.createReadStream(filePath).pipe(res);
    } catch (error) {
        console.error("PDF Serve Error:", error);
        res.status(500).send('Error serving Loan Contract PDF');
    }
};

export const downloadIndividualPaper = async (req, res) => {
    try {
        const filePath = '/usr/src/app/static/anhatakan.pdf';
        if (!fs.existsSync(filePath)) return res.status(404).send('Individual paper file not found');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="anhatakan.pdf"');
        fs.createReadStream(filePath).pipe(res);
    } catch (error) {
        console.error("PDF Serve Error:", error);
        res.status(500).send('Error serving Individual Paper PDF');
    }
};

export const getApplications = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const applications = await prisma.application.findMany({
            where: { tenantId },
            include: { applicant: true, loanType: true, partner: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(applications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
};
