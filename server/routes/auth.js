const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /login
router.post('/login', async (req, res) => {
    // TODO: Implement login
    res.json({ message: 'Login endpoint' });
});

// POST /register
router.post('/register', async (req, res) => {
    // TODO: Implement registration
    res.json({ message: 'Register endpoint' });
});

module.exports = router;
