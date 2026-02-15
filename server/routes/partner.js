const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Admin routes for managing partners

// POST /partner
router.post('/', async (req, res) => {
    // TODO: Create partner
    res.json({ message: 'Create partner' });
});

// GET /partner
router.get('/', async (req, res) => {
    // TODO: List partners
    res.json({ message: 'List partners' });
});

module.exports = router;
