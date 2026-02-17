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
const { verifyToken } = require('./middleware/auth');

app.use('/api/auth', require('./routes/auth'));
app.use('/api/enrichment', verifyToken, require('./routes/enrichment'));
app.use('/api/partners', require('./routes/partner')); // Protected by API Key inside
app.use('/api/applications', verifyToken, require('./routes/loans'));
app.use('/api/documents', verifyToken, require('./routes/documents'));
app.use('/api/config', verifyToken, require('./routes/config'));
app.use('/api/admin/partners', verifyToken, require('./routes/partners'));

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
