import express from 'express';
import { createApplicant, getApplicants, lookupApplicant } from '../controllers/applicantController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @swagger
 * tags:
 *   name: Applicants
 *   description: Borrower/Applicant management
 */

/**
 * @swagger
 * /applicants:
 *   post:
 *     summary: Create a new applicant
 *     tags: [Applicants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *             properties:
 *               type:
 *                 type: string
 *               role:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               companyName:
 *                 type: string
 *               taxId:
 *                 type: string
 *               ssn:
 *                 type: string
 *               passport:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Applicant created
 *   get:
 *     summary: Get all applicants for the tenant
 *     tags: [Applicants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of applicants
 * 
 *   /applicants/lookup:
 *     get:
 *       summary: Mock Ekeng ID Verification Lookup
 *       tags: [Applicants]
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *         - in: query
 *           name: ssn
 *           schema:
 *             type: string
 *         - in: query
 *           name: passport
 *           schema:
 *             type: string
 *       responses:
 *         200:
 *           description: Verified Identity Data
 */
router.post('/', createApplicant);
router.get('/', getApplicants);
router.get('/lookup', lookupApplicant);

export default router;
