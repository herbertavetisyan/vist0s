import express from 'express';
import { createPartner, getPartners, terminatePartner } from '../controllers/partnerController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { tenantMiddleware } from '../middlewares/tenantMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @swagger
 * tags:
 *   name: Partners
 *   description: Partner API Key Management
 */

/**
 * @swagger
 * /partners:
 *   post:
 *     summary: Create a new partner
 *     tags: [Partners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Partner created
 *   get:
 *     summary: Get all partners for the tenant
 *     tags: [Partners]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of partners
 */
router.post('/', createPartner);
router.get('/', getPartners);

/**
 * @swagger
 * /partners/{id}/terminate:
 *   put:
 *     summary: Terminate a partner's API Key
 *     tags: [Partners]
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
 *         description: Partner terminated successfully
 *       404:
 *         description: Partner not found
 */
router.put('/:id/terminate', terminatePartner);

export default router;
