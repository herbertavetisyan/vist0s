import express from 'express';
import { createLoanType, getLoanTypes, updateLoanType, deleteLoanType } from '../controllers/loanTypeController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @swagger
 * tags:
 *   name: LoanTypes
 *   description: Loan configuration
 */

/**
 * @swagger
 * /loan-types:
 *   post:
 *     summary: Create a new loan type
 *     tags: [LoanTypes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               currency:
 *                 type: string
 *               minAmount:
 *                 type: number
 *               maxAmount:
 *                 type: number
 *               minTenure:
 *                 type: integer
 *               maxTenure:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Created
 *   get:
 *     summary: Retrieve all loan types
 *     tags: [LoanTypes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of loan types
 */
router.post('/', createLoanType);
router.get('/', getLoanTypes);

/**
 * @swagger
 * /loan-types/{id}:
 *   put:
 *     summary: Update an existing loan type
 *     tags: [LoanTypes]
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
 *               name:
 *                 type: string
 *               minAmount:
 *                 type: number
 *               maxAmount:
 *                 type: number
 *               minTenure:
 *                 type: integer
 *               maxTenure:
 *                 type: integer
 *               allowedApplicantTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *               allowedRoles:
 *                 type: array
 *                 items:
 *                   type: string
 *               requiredDocuments:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Updated successfully
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a loan type
 *     tags: [LoanTypes]
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
 *         description: Deleted successfully
 *       409:
 *         description: Cannot delete due to existing application relationships
 */
router.put('/:id', updateLoanType);
router.delete('/:id', deleteLoanType);

export default router;
