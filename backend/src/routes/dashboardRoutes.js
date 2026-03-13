import { Router } from 'express';
import { getDashboardMetrics } from '../controllers/dashboardController.js';

const router = Router();

// GET /api/dashboard/metrics
router.get('/metrics', getDashboardMetrics);

export default router;
