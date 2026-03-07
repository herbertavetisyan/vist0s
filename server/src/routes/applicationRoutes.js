import express from 'express';
import {
    createApplication,
    getApplications,
    processIdVerification,
    processIncomeVerification,
    processCreditBureau,
    processScoring,
    processManualReview,
    recalculateLoan,
    sendOtp,
    verifyOtp,
    generateContracts,
    processDisbursement,
    downloadLoanContract,
    downloadIndividualPaper
} from '../controllers/applicationController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';

const router = express.Router();

// Protected by internal Auth OR Partner API key
// For simplicity in this structure, we'll assume internal User auth is standard here.
// In a full production setup, we'd have a separate middleware path for API keys for Partner endpoints.

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @swagger
 * tags:
 *   name: Applications
 *   description: Loan Application processing and stages
 */

/**
 * @swagger
 * /applications:
 *   get:
 *     summary: Get all applications for the tenant
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of applications
 *   post:
 *     summary: Create a new application
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               applicantId:
 *                 type: string
 *               loanTypeId:
 *                 type: string
 *               requestedAmount:
 *                 type: number
 *               requestedTenure:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Application created
 */
router.get('/', getApplications);
router.post('/', createApplication);

// Stage Processing
/**
 * @swagger
 * /applications/{id}/stages/id-verification:
 *   post:
 *     summary: Process ID Verification stage (Ekeng Mock)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stage processed
 */
router.post('/:id/stages/id-verification', processIdVerification);

/**
 * @swagger
 * /applications/{id}/stages/income:
 *   post:
 *     summary: Process Income Verification stage (NORQ Mock)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stage processed
 */
router.post('/:id/stages/income', processIncomeVerification);

/**
 * @swagger
 * /applications/{id}/stages/credit-bureau:
 *   post:
 *     summary: Process Credit Bureau stage (ACRA Mock)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stage processed
 */
router.post('/:id/stages/credit-bureau', processCreditBureau);

/**
 * @swagger
 * /applications/{id}/stages/scoring:
 *   post:
 *     summary: Process Scoring Engine stage (DMS Mock)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Stage processed
 */
router.post('/:id/stages/scoring', processScoring);

/**
 * @swagger
 * /applications/{id}/stages/manual-review:
 *   post:
 *     summary: Process Manual Review
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               decision:
 *                 type: string
 *               overrideAmount:
 *                 type: number
 *               overrideTenure:
 *                 type: integer
 *               overrideRate:
 *                 type: number
 *     responses:
 *       200:
 *         description: Stage processed
 */
router.post('/:id/stages/manual-review', processManualReview);

/**
 * @swagger
 * /applications/{id}/recalculate:
 *   post:
 *     summary: Recalculate loan schedule and final amount
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               finalAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Recalulated data
 */
router.post('/:id/recalculate', recalculateLoan);

/**
 * @swagger
 * /applications/{id}/otp/send:
 *   post:
 *     summary: Send OTP for contract signature
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OTP Sent
 */
router.post('/:id/otp/send', sendOtp);

/**
 * @swagger
 * /applications/{id}/otp/verify:
 *   post:
 *     summary: Verify OTP for contract signature
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP Verified
 */
router.post('/:id/otp/verify', verifyOtp);

/**
 * @swagger
 * /applications/{id}/documents/contract:
 *   get:
 *     summary: Download Loan Contract PDF
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF File
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/documents/contract', downloadLoanContract);

/**
 * @swagger
 * /applications/{id}/documents/individual-paper:
 *   get:
 *     summary: Download Individual Paper PDF
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF File
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/:id/documents/individual-paper', downloadIndividualPaper);

/**
 * @swagger
 * /applications/{id}/stages/contracts:
 *   post:
 *     summary: Generate Contracts
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contracts generated
 */
router.post('/:id/stages/contracts', generateContracts);

/**
 * @swagger
 * /applications/{id}/stages/disbursement:
 *   post:
 *     summary: Process Disbursement (Armsoft Mock)
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Funds disbursed
 */
router.post('/:id/stages/disbursement', processDisbursement);

export default router;
