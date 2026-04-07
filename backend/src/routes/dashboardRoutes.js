import { Router } from 'express';
import { getDashboardState } from '../controllers/dashboardController.js';

const router = Router();

// Unified dashboard state (used for REST fallback when SSE is unavailable)
// GET /api/dashboard/state
router.get('/state', getDashboardState);

export default router;
