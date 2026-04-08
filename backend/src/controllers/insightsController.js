import { computeInsightsOverview } from '../services/insightsService.js';

// GET /api/insights
export async function getInsights(req, res) {
  try {
    const overview = await computeInsightsOverview();
    return res.json({ success: true, data: overview });
  } catch (err) {
    console.error('[insights] getInsights failed:', err?.message || err);
    return res.status(500).json({ success: false, error: 'Failed to compute AI insights' });
  }
}

export default { getInsights };
