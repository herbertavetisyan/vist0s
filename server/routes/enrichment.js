const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { executeEnrichment } = require('../services/enrichmentService');

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/enrichment:
 *   post:
 *     summary: Create enrichment request
 *     description: Creates a new enrichment request and executes sequential service calls (NORQ → EKENG → ACRA → DMS)
 *     tags: [Enrichment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EnrichmentRequest'
 *     responses:
 *       202:
 *         description: Enrichment request created and processing started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EnrichmentResponse'
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */

/**
 * POST /api/enrichment
 * Create a new enrichment request and execute sequential service calls
 */
router.post('/', async (req, res) => {
    try {
        const { nationalId, phone, email } = req.body;

        // Validate input
        if (!nationalId || !phone || !email) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['nationalId', 'phone', 'email']
            });
        }

        // Create enrichment request
        const enrichmentRequest = await prisma.enrichmentRequest.create({
            data: {
                nationalId,
                phone,
                email,
                status: 'PENDING'
            }
        });

        // Execute enrichment asynchronously (don't wait for completion)
        // This allows the API to return immediately while processing continues
        executeEnrichment(
            { nationalId, phone, email },
            prisma,
            enrichmentRequest.id
        ).catch(error => {
            console.error('Enrichment execution error:', error);
        });

        // Return immediately with request ID
        res.status(202).json({
            message: 'Enrichment request created and processing started',
            enrichmentRequestId: enrichmentRequest.id,
            status: 'PENDING',
            pollUrl: `/api/enrichment/${enrichmentRequest.id}`
        });

    } catch (error) {
        console.error('Error creating enrichment request:', error);
        res.status(500).json({
            error: 'Failed to create enrichment request',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/enrichment/{id}:
 *   get:
 *     summary: Get enrichment request status
 *     description: Returns the current status, progress, and results of an enrichment request by ID.
 *     tags: [Enrichment]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The enrichment request ID
 *     responses:
 *       200:
 *         description: Enrichment request details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EnrichmentStatus'
 *       404:
 *         description: Enrichment request not found
 *       500:
 *         description: Server error
 */

/**
 * GET /api/enrichment/:id
 * Get enrichment request status and results
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const enrichmentRequest = await prisma.enrichmentRequest.findUnique({
            where: { id: parseInt(id) },
            include: {
                results: {
                    orderBy: { sequenceOrder: 'asc' }
                }
            }
        });

        if (!enrichmentRequest) {
            return res.status(404).json({
                error: 'Enrichment request not found'
            });
        }

        // Calculate progress
        const totalServices = 4; // norq, ekeng, acra, dms
        const completedServices = enrichmentRequest.results.length;
        const progress = Math.round((completedServices / totalServices) * 100);

        res.json({
            id: enrichmentRequest.id,
            nationalId: enrichmentRequest.nationalId,
            phone: enrichmentRequest.phone,
            email: enrichmentRequest.email,
            status: enrichmentRequest.status,
            progress,
            createdAt: enrichmentRequest.createdAt,
            updatedAt: enrichmentRequest.updatedAt,
            results: enrichmentRequest.results.map(result => ({
                serviceName: result.serviceName,
                status: result.status,
                sequenceOrder: result.sequenceOrder,
                requestedAt: result.requestedAt,
                respondedAt: result.respondedAt,
                responseData: result.responseData,
                errorMessage: result.errorMessage,
                responseTime: result.respondedAt && result.requestedAt
                    ? new Date(result.respondedAt) - new Date(result.requestedAt)
                    : null
            }))
        });

    } catch (error) {
        console.error('Error fetching enrichment request:', error);
        res.status(500).json({
            error: 'Failed to fetch enrichment request',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/enrichment:
 *   get:
 *     summary: List enrichment requests
 *     description: Returns a paginated list of all enrichment requests.
 *     tags: [Enrichment]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of records to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of records to skip
 *     responses:
 *       200:
 *         description: List of enrichment requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       nationalId:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       email:
 *                         type: string
 *                       status:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       resultsCount:
 *                         type: integer
 */

/**
 * GET /api/enrichment
 * List all enrichment requests
 */
router.get('/', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const enrichmentRequests = await prisma.enrichmentRequest.findMany({
            take: parseInt(limit),
            skip: parseInt(offset),
            orderBy: { createdAt: 'desc' },
            include: {
                results: {
                    orderBy: { sequenceOrder: 'asc' }
                }
            }
        });

        const total = await prisma.enrichmentRequest.count();

        res.json({
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            data: enrichmentRequests.map(req => ({
                id: req.id,
                nationalId: req.nationalId,
                phone: req.phone,
                email: req.email,
                status: req.status,
                createdAt: req.createdAt,
                resultsCount: req.results.length
            }))
        });

    } catch (error) {
        console.error('Error listing enrichment requests:', error);
        res.status(500).json({
            error: 'Failed to list enrichment requests',
            details: error.message
        });
    }
});

module.exports = router;
