import { computeDashboardMetrics } from '../services/dashboardMetricsService.js';

// GET /api/dashboard/metrics
export async function getDashboardMetrics(req, res) {
  try {
    const {
      totalPipelines,
      activeBuilds,
      failedToday,
      avgFixTimeSeconds,
      aiAccuracy,
    } = await computeDashboardMetrics();

    const avgSeconds = Number.isFinite(avgFixTimeSeconds) ? Math.round(avgFixTimeSeconds) : 0;
    const avgFixTime = formatDuration(avgSeconds);

    return res.json({
      totalPipelines,
      activeBuilds,
      failedToday,
      avgFixTime,
      avgFixTimeSeconds: avgSeconds,
      aiAccuracy,
    });
  } catch (e) {
    console.error('Failed to compute dashboard metrics:', e?.message || e);
    return res.status(502).json({
      error: 'Failed to compute dashboard metrics',
      details: process.env.NODE_ENV === 'development' ? (e?.message || String(e)) : undefined,
    });
  }
}

function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0s';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  return `${seconds}s`;
}

export default { getDashboardMetrics };
