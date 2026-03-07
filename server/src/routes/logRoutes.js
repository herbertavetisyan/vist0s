import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getLogFiles, getLogContent } from '../controllers/logController.js';

const router = express.Router();

// Require authenticated user (Admin dashboard) to access logs
router.use(authMiddleware);

router.get('/', getLogFiles);
router.get('/:filename', getLogContent);

export default router;
