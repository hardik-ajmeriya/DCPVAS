import PipelineAIAnalysis from '../models/PipelineAIAnalysis.js';
import { listJenkinsJobs, getJenkinsBuilds } from '../services/jenkinsService.js';

// GET /api/dashboard/metrics
// Computes key dashboard metrics from live Jenkins data + stored AI analysis.
export async function getDashboardMetrics(req, res) {
  try {
    const now = Date.now();
    const [jobs, builds] = await Promise.all([
      listJenkinsJobs().catch(() => []),
      getJenkinsBuilds(200).catch(() => []),
    ]);

    // 1) totalPipelines: count Jenkins jobs on the server
    const totalPipelines = Array.isArray(jobs) ? jobs.length : 0;

    // 2) activeBuilds: builds currently running
    const activeBuilds = Array.isArray(builds)
      ? builds.filter((b) => b?.building === true).length
      : 0;

    // 3) failedToday: Jenkins result FAILURE within last 24h
    const failedToday = Array.isArray(builds)
      ? builds.filter((b) => String(b?.result || '').toUpperCase() === 'FAILURE'
        && typeof b?.timestamp === 'number'
        && (now - b.timestamp) < 24 * 60 * 60 * 1000).length
      : 0;

    // 4) avgFixTime: average seconds from a FAILURE to the next SUCCESS
    const sortedBuilds = Array.isArray(builds)
      ? builds.filter((b) => typeof b?.timestamp === 'number').slice().sort((a, b) => a.timestamp - b.timestamp)
      : [];
    let lastFailureTs = null;
    const deltas = [];
    for (const b of sortedBuilds) {
      const result = String(b?.result || '').toUpperCase();
      if (result === 'FAILURE') {
        lastFailureTs = b.timestamp;
      } else if (result === 'SUCCESS' && lastFailureTs != null) {
        const diff = b.timestamp - lastFailureTs;
        if (diff > 0) deltas.push(diff);
        lastFailureTs = null;
      }
    }
    const avgFixTime = deltas.length
      ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length / 1000)
      : null;

    // 5) aiAccuracy: based on predictedCause vs actualCause in AI analysis docs
    const aiAccAgg = await PipelineAIAnalysis.aggregate([
      {
        $match: {
          predictedCause: { $exists: true, $ne: null },
          actualCause: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          correct: { $sum: { $cond: [{ $eq: ['$predictedCause', '$actualCause'] }, 1, 0] } },
        },
      },
    ]).catch(() => []);

    const totalPredictions = Array.isArray(aiAccAgg) && aiAccAgg.length ? aiAccAgg[0].total || 0 : 0;
    const correctPredictions = Array.isArray(aiAccAgg) && aiAccAgg.length ? aiAccAgg[0].correct || 0 : 0;
    const aiAccuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;

    return res.json({
      totalPipelines,
      activeBuilds,
      failedToday,
      avgFixTime,
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

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export default { getDashboardMetrics };
