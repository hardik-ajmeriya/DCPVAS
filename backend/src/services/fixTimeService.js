import PipelineRun from '../models/PipelineRun.js';

const FAILURE_STATUSES = ['FAILED', 'FAILURE'];
const SUCCESS_STATUSES = ['SUCCESS'];

// Simple, readable approach: iterates per jobName in JS. Correctness-focused, not over-optimized.
export async function calculateAvgFixTime() {
  const runs = await PipelineRun.find({}, 'jobName buildNumber status createdAt')
    .sort({ jobName: 1, buildNumber: 1, createdAt: 1 })
    .lean();

  if (!Array.isArray(runs) || runs.length === 0) {
    return { seconds: 0, formatted: '0m' };
  }

  let totalSeconds = 0;
  let pairCount = 0;

  // Process per job to avoid cross-job pairing
  let currentJob = null;
  let pendingFailures = [];

  const flushJob = () => {
    pendingFailures = [];
    currentJob = null;
  };

  for (const run of runs) {
    if (!run?.jobName || !run?.createdAt) continue;
    const createdAt = new Date(run.createdAt).getTime();
    if (!Number.isFinite(createdAt)) continue;

    if (currentJob !== run.jobName) {
      flushJob();
      currentJob = run.jobName;
    }

    const status = String(run.status || '').toUpperCase();

    if (FAILURE_STATUSES.includes(status)) {
      pendingFailures.push(createdAt);
      continue;
    }

    if (SUCCESS_STATUSES.includes(status) && pendingFailures.length > 0) {
      for (const failTs of pendingFailures) {
        const delta = (createdAt - failTs) / 1000;
        if (delta > 0) {
          totalSeconds += delta;
          pairCount += 1;
        }
      }
      pendingFailures = [];
    }
  }

  const avgSeconds = pairCount > 0 ? Math.round(totalSeconds / pairCount) : 0;
  return { seconds: avgSeconds, formatted: formatDuration(avgSeconds) };
}

// Optimized aggregation for large datasets (MongoDB 5+). Still returns seconds + formatted.
export async function calculateAvgFixTimeAgg() {
  const agg = await PipelineRun.aggregate([
    { $match: { status: { $in: [...FAILURE_STATUSES, ...SUCCESS_STATUSES] } } },
    { $project: { jobName: 1, status: 1, createdAt: 1, buildNumber: 1 } },
    {
      $setWindowFields: {
        partitionBy: '$jobName',
        sortBy: { createdAt: 1, buildNumber: 1 },
        output: {
          nextStatus: { $shift: { output: '$status', by: 1 } },
          nextTime: { $shift: { output: '$createdAt', by: 1 } },
        },
      },
    },
    {
      $match: {
        status: { $in: FAILURE_STATUSES },
        nextStatus: { $in: SUCCESS_STATUSES },
        nextTime: { $ne: null },
      },
    },
    {
      $project: {
        diffSeconds: { $divide: [{ $subtract: ['$nextTime', '$createdAt'] }, 1000] },
      },
    },
    { $match: { diffSeconds: { $gt: 0 } } },
    {
      $group: {
        _id: null,
        avgSeconds: { $avg: '$diffSeconds' },
        samples: { $sum: 1 },
      },
    },
  ]);

  const avgSeconds = Array.isArray(agg) && agg[0]?.avgSeconds ? Math.round(agg[0].avgSeconds) : 0;
  return { seconds: avgSeconds, formatted: formatDuration(avgSeconds) };
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0m';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

export default { calculateAvgFixTime, calculateAvgFixTimeAgg, formatDuration };
