import { buildDashboardState } from '../services/dashboardStateService.js';

// GET /api/dashboard/state
export async function getDashboardState(req, res) {
  try {
    const state = await buildDashboardState({ type: 'rest_snapshot' });
    return res.json(state);
  } catch (e) {
    console.error('Failed to build dashboard state:', e?.message || e);
    return res.status(502).json({ error: 'Failed to build dashboard state' });
  }
}

export default { getDashboardState };
