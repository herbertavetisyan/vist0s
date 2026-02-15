const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all stages
router.get('/stages', async (req, res) => {
    try {
        const stages = await prisma.stage.findMany({
            orderBy: { id: 'asc' } // Default order by ID since global order is removed
        });
        res.json(stages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch stages' });
    }
});

// Create new Product Type
router.post('/products', async (req, res) => {
    try {
        const {
            name, description, currency,
            minAmount, maxAmount, interestRate,
            minTenure, maxTenure,
            stages, // Array of stage names in order
            entities // Array of { type, role, required }
        } = req.body;

        // Validation
        if (!name || !currency || !minAmount || !maxAmount || !interestRate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Product Type
            const product = await tx.productType.create({
                data: {
                    name,
                    description,
                    currency,
                    minAmount,
                    maxAmount,
                    interestRate,
                    minTenure: minTenure || 12,
                    maxTenure: maxTenure || 60
                }
            });

            // 2. Link Stages
            if (stages && stages.length > 0) {
                // Get stage IDs
                const dbStages = await tx.stage.findMany({
                    where: { name: { in: stages } }
                });

                const stageMap = {};
                dbStages.forEach(s => stageMap[s.name] = s.id);

                for (let i = 0; i < stages.length; i++) {
                    const stageName = stages[i];
                    if (stageMap[stageName]) {
                        await tx.productStage.create({
                            data: {
                                productTypeId: product.id,
                                stageId: stageMap[stageName],
                                order: i + 1,
                                isRequired: true
                            }
                        });
                    }
                }
            }

            // 3. Link Entities
            if (entities && entities.length > 0) {
                for (const entity of entities) {
                    await tx.productEntity.create({
                        data: {
                            productTypeId: product.id,
                            entityType: entity.type,
                            role: entity.role,
                            isRequired: entity.required || false
                        }
                    });
                }
            }

            return product;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Product name already exists' });
        }
        res.status(500).json({ error: 'Failed to create product configuration' });
    }
});

module.exports = router;
