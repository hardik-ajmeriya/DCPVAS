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
  }
}

export default { getInsights };
