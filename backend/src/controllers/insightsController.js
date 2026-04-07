<<<<<<< HEAD
import { computeInsights } from '../services/insightsService.js';

// GET /api/insights
export async function getInsights(req, res) {
  try {
    const insights = await computeInsights();
    return res.json(insights);
  } catch (err) {
    console.error('Failed to compute AI insights:', err?.message || err);
    return res.status(502).json({
      error: 'Failed to compute AI insights',
      details: process.env.NODE_ENV === 'development' ? (err?.message || String(err)) : undefined,
    });
=======
import { computeInsightsOverview } from '../services/insightsService.js';

export async function getInsights(req, res) {
  try {
    const overview = await computeInsightsOverview();
    res.json({ success: true, data: overview });
  } catch (err) {
    console.error('[insights] getInsights failed:', err?.message || err);
    res.status(500).json({ success: false, error: 'Failed to compute AI insights' });
>>>>>>> 526fa79 (fix: scalaton loading & jenkins config)
  }
}

export default { getInsights };
