import express from 'express';
import { partnerMiddleware } from '../middlewares/partnerMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';
import { createApplicationFromPartner, recalculateApplicationFromPartner, submitAccountNumberFromPartner } from '../controllers/partnerApiController.js';
import { partnerApiErrorHandler } from '../middlewares/errorHandler.js';
import logger, { redactSensitiveData } from '../utils/logger.js';

const router = express.Router();

// Log all incoming requests to the Partner API, before auth
router.use((req, res, next) => {
    logger.info(`Partner API Hit [${req.method}] ${req.originalUrl}`, {
        ip: req.ip,
        method: req.method,
        path: req.originalUrl,
        payload: redactSensitiveData(req.body)
    });
    next();
});

router.use(partnerMiddleware); // Replaces authMiddleware, uses API Key header
router.use(tenantMiddleware);  // Extracts tenant and partner info from the validated Key

/**
 * @swagger
 * tags:
 *   name: External API
 *   description: Partner Integration Endpoints
 */

/**
 * @swagger
 * /external/applications:
 *   post:
 *     summary: Create a new application via Partner API
 *     tags: [External API]
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - passport
 *               - firstName
 *               - lastName
 *               - phone
 *               - email
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Short product code (e.g. "001")
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               passport:
 *                 type: string
 *                 description: Applicant passport number (mandatory)
 *               ssn:
 *                 type: string
 *                 description: Social Security Number (optional)
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               requestedAmount:
 *                 type: number
 *                 description: Requested loan amount (optional)
 *               requestedTenure:
 *                 type: integer
 *                 description: Requested tenure in months (optional)
 *               passportScan:
 *                 type: string
 *                 description: Source URL link to the passport scan image
 *               selfieData:
 *                 type: string
 *                 description: Source URL link to the biometric selfie image
 *               livenessData:
 *                 type: object
 *                 description: Full KYC/verification payload from partner (e.g. Didit)
 *                 properties:
 *                   applicationId:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                   loanRequest:
 *                     type: object
 *                     properties:
 *                       amount:
 *                         type: number
 *                       currency:
 *                         type: string
 *                       type:
 *                         type: string
 *                       term:
 *                         type: integer
 *                   applicant:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       mobileNumber:
 *                         type: string
 *                       ssn:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       idDocument:
 *                         type: object
 *                   kyc:
 *                     type: object
 *                     description: Full Didit verification session data (id_verifications, liveness_checks, face_matches, ip_analyses, images, etc.)
 *                     properties:
 *                       sessionId:
 *                         type: string
 *                       status:
 *                         type: string
 *                       data:
 *                         type: object
 *                       images:
 *                         type: object
 *                   questionnaire:
 *                     type: object
 *                     description: Pre-qualification questionnaire answers
 *                     properties:
 *                       salary:
 *                         type: string
 *                       creditHistory:
 *                         type: string
 *                       unpledgedLoans:
 *                         type: string
 *                       overdueDays:
 *                         type: string
 *     responses:
 *       201:
 *         description: Application created successfully
 *       400:
 *         description: Missing required fields or invalid productId
 */
router.post('/applications', createApplicationFromPartner);

/**
 * @swagger
 * /external/applications/{id}/recalculate:
 *   post:
 *     summary: Recalculate scoring for an existing application via Partner API
 *     tags: [External API]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ExecutedAmount
 *             properties:
 *               ExecutedAmount:
 *                 type: number
 *                 description: The new requested amount to recalculate scoring for, representing the requested loan limit
 *     responses:
 *       200:
 *         description: Application recalculated successfully
 *       404:
 *         description: Application not found
 *       400:
 *         description: Application cannot be recalculated
 */
router.post('/applications/:id/recalculate', recalculateApplicationFromPartner);

/**
 * @swagger
 * /external/applications/{id}/account-number:
 *   post:
 *     summary: Submit an account number and exact recalculated response to finalize contracts (Partner API)
 *     tags: [External API]
 *     security:
 *       - apiKeyAuth: []
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
 *               accountNumber:
 *                 type: string
 *               recalculatedResponse:
 *                 type: object
 *     responses:
 *       200:
 *         description: Account successfully accepted and PDFs generated
 *       400:
 *         description: Validation failed (Mismatched recalculated payload)
 */
router.post('/applications/:id/account-number', submitAccountNumberFromPartner);

router.use(partnerApiErrorHandler); // Catch-all partner API errors go here

export default router;

