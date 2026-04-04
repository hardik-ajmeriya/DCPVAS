import PipelineRun from '../models/PipelineRun.js';
import PipelineRawLog from '../models/PipelineRawLog.js';
import PipelineAIAnalysis from '../models/PipelineAIAnalysis.js';

const FAILURE_STATUSES = ['FAILURE', 'FAILED'];
const SUCCESS_STATUSES = ['SUCCESS'];
const RUNNING_STATUSES = ['RUNNING', 'BUILDING'];

function toCount(aggResult) {
  if (Array.isArray(aggResult) && aggResult[0] && Number.isFinite(aggResult[0].count)) {
    return aggResult[0].count;
  }
  return 0;
}

export async function computeDashboardMetrics() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalPipelinesAgg,
    activeRunsAgg,
    activeRawAgg,
    failedTodayAgg,
    failedTodayRawAgg,
    fixTimeAgg,
    aiAccuracyAgg,
  ] = await Promise.all([
    // Unique pipelines (jobName)
    PipelineRun.aggregate([
      { $group: { _id: '$jobName' } },
      { $count: 'count' },
    ]),
    // Latest run per pipeline to see if still running
    PipelineRun.aggregate([
      { $sort: { jobName: 1, createdAt: -1, buildNumber: -1 } },
      {
        $group: {
          _id: '$jobName',
          latestStatus: { $first: '$status' },
          latestFinishedAt: { $first: '$finishedAt' },
        },
      },
      {
        $match: {
          $or: [
            { latestStatus: { $in: RUNNING_STATUSES } },
            { $and: [{ latestFinishedAt: { $eq: null } }, { latestStatus: { $in: ['UNKNOWN'] } }] },
          ],
        },
      },
      { $count: 'count' },
    ]),
    // Raw log stream may carry building=true before summary is persisted
    PipelineRawLog.aggregate([
      { $sort: { jobName: 1, executedAt: -1 } },
      {
        $group: {
          _id: '$jobName',
          latestBuildStatus: { $first: '$buildStatus' },
          latestBuilding: { $first: '$building' },
          latestStatus: { $first: '$status' },
        },
      },
      {
        $match: {
          $or: [
            { latestBuilding: true },
            { latestBuildStatus: { $in: ['BUILDING', 'QUEUED'] } },
            { latestStatus: 'RUNNING' },
          ],
        },
      },
      { $count: 'count' },
    ]),
    // Failures that started today
    PipelineRun.aggregate([
      {
        $addFields: {
          // Prefer execution timestamps over createdAt so backfilled docs still count on the right day
          eventTime: {
            $ifNull: [
              '$executedAt',
              { $ifNull: ['$startedAt', { $ifNull: ['$finishedAt', '$createdAt'] }] },
            ],
          },
        },
      },
      {
        $match: {
          status: { $in: FAILURE_STATUSES },
          eventTime: { $gte: startOfToday, $lte: now },
        },
      },
      { $count: 'count' },
    ]),
    // Failures today from raw log stream (covers cases before summary upsert)
    PipelineRawLog.aggregate([
      {
        $match: {
          status: { $in: FAILURE_STATUSES },
          executedAt: { $gte: startOfToday, $lte: now },
        },
      },
      { $count: 'count' },
    ]),
    // Average time from failure to next success (per job)
    PipelineRun.aggregate([
      {
        $match: {
          status: { $in: [...FAILURE_STATUSES, ...SUCCESS_STATUSES] },
        },
      },
      {
        $addFields: {
          eventTime: {
            $ifNull: [
              '$executedAt',
              { $ifNull: ['$startedAt', { $ifNull: ['$finishedAt', '$createdAt'] }] },
            ],
          },
        },
      },
      { $match: { eventTime: { $ne: null } } },
      {
        $setWindowFields: {
          partitionBy: '$jobName',
          sortBy: { eventTime: 1 },
          output: {
            nextStatus: { $shift: { output: '$status', by: 1 } },
            nextEventTime: { $shift: { output: '$eventTime', by: 1 } },
          },
        },
      },
      {
        $match: {
          status: { $in: FAILURE_STATUSES },
          nextStatus: { $in: SUCCESS_STATUSES },
          nextEventTime: { $ne: null },
        },
      },
      {
        $project: {
          diffSeconds: { $divide: [{ $subtract: ['$nextEventTime', '$eventTime'] }, 1000] },
        },
      },
      { $match: { diffSeconds: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgFixSeconds: { $avg: '$diffSeconds' },
          samples: { $sum: 1 },
        },
      },
    ]),
    // AI accuracy from prediction vs actual labels
    PipelineAIAnalysis.aggregate([
      {
        $addFields: {
          predicted: {
            $ifNull: [
              '$predictedOutcome',
              { $ifNull: ['$predictedCause', { $ifNull: ['$predictedLabel', null] }] },
            ],
          },
          actual: {
            $ifNull: ['$actualOutcome', { $ifNull: ['$actualCause', { $ifNull: ['$actualLabel', null] }] }],
          },
        },
      },
      { $match: { predicted: { $ne: null }, actual: { $ne: null } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          correct: { $sum: { $cond: [{ $eq: ['$predicted', '$actual'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const totalPipelines = toCount(totalPipelinesAgg);
  const activeFromRaw = toCount(activeRawAgg);
  const activeFromRuns = toCount(activeRunsAgg);
  const activeBuilds = activeFromRaw || activeFromRuns;
  const failedToday = Math.max(toCount(failedTodayAgg), toCount(failedTodayRawAgg));

  const avgFixSeconds = Array.isArray(fixTimeAgg) && fixTimeAgg[0]?.avgFixSeconds
    ? Number(fixTimeAgg[0].avgFixSeconds)
    : 0;

  const totalPred = Array.isArray(aiAccuracyAgg) && aiAccuracyAgg[0]?.total ? aiAccuracyAgg[0].total : 0;
  const correctPred = Array.isArray(aiAccuracyAgg) && aiAccuracyAgg[0]?.correct ? aiAccuracyAgg[0].correct : 0;
  const aiAccuracy = totalPred > 0 ? Math.round((correctPred / totalPred) * 100) : 0;

  return {
    totalPipelines,
    activeBuilds,
    failedToday,
    avgFixTimeSeconds: Number.isFinite(avgFixSeconds) ? avgFixSeconds : 0,
    aiAccuracy,
  };
}

export default { computeDashboardMetrics };
