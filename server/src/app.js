import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
import authRoutes from './routes/authRoutes.js';
import partnerRoutes from './routes/partnerRoutes.js';
import loanTypeRoutes from './routes/loanTypeRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import applicantRoutes from './routes/applicantRoutes.js';
import partnerApiRoutes from './routes/partnerApiRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import logRoutes from './routes/logRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/loan-types', loanTypeRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/applicants', applicantRoutes);
app.use('/api/external', partnerApiRoutes); // External Partner API endpoint
app.use('/api/settings', settingsRoutes);
app.use('/api/logs', logRoutes); // Winston logs endpoint

// Serve uploaded KYC images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/', (req, res) => {
    res.send('VistOS Application Platform API');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
