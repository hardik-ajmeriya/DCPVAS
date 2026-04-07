import { Router } from 'express';
import { getInsights } from '../controllers/insightsController.js';

const router = Router();

// GET /api/insights
router.get('/', getInsights);

export default router;
