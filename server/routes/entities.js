const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Manage Applicants/Guarantors

// GET /entities/search
router.get('/search', async (req, res) => {
    // TODO: Search entities by National ID or Name
    res.json({ message: 'Search entities' });
});

// POST /entities
router.post('/', async (req, res) => {
    // TODO: Create entity
    res.json({ message: 'Create entity' });
});

module.exports = router;
