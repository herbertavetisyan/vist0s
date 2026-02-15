const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { specs, swaggerUi } = require('./swagger');

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database check (placeholder)
const prisma = new PrismaClient();

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'VistLos API Documentation'
}));

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/enrichment', require('./routes/enrichment'));
app.use('/api/partners', require('./routes/partner'));
app.use('/api/applications', require('./routes/loans'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api/config', require('./routes/config'));

// Root handler
app.get('/', (req, res) => {
    res.json({ message: 'VistOs API is running', version: '1.0.0' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
