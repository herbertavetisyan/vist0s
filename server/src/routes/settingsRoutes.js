import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// All settings routes require authentication mapping to the tenant
router.use(authMiddleware);

router.get('/', getSettings);
router.post('/', updateSettings);

export default router;
