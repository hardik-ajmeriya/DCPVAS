<<<<<<< HEAD
import PipelineRun from '../models/PipelineRun.js';
import PipelineRawLog from '../models/PipelineRawLog.js';
import PipelineAIAnalysis from '../models/PipelineAIAnalysis.js';

const SUCCESS_STATUSES = ['SUCCESS'];
const FAILURE_STATUSES = ['FAILURE', 'FAILED'];
const TERMINAL_STATUSES = ['SUCCESS', 'FAILURE', 'FAILED', 'ABORTED'];
const FAILED_STAGE_STATUSES = ['FAILED', 'FAILURE'];
const STAGE_WINDOW_SIZE = 500;
const TREND_DAYS = 7;
const UTC_TIMEZONE = 'UTC';

function startOfUtcDay(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addUtcDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function formatDateKeyUtc(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function formatWeekdayUtc(date) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short', timeZone: UTC_TIMEZONE });
}

function toSafeNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function toPercent(numerator, denominator) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function buildTrendBuckets() {
  const end = startOfUtcDay(new Date());
  const start = addUtcDays(end, -(TREND_DAYS - 1));
  const buckets = [];

  for (let i = 0; i < TREND_DAYS; i += 1) {
    const day = addUtcDays(start, i);
    buckets.push({
      date: formatDateKeyUtc(day),
      day: formatWeekdayUtc(day),
      failures: 0,
      topIssue: null,
    });
  }

  return buckets;
}

async function aggregateStageStats(Model, matchFilter, dateField) {
  return Model.aggregate([
    { $match: matchFilter },
    { $sort: { [dateField]: -1, createdAt: -1 } },
    { $limit: STAGE_WINDOW_SIZE },
    { $unwind: '$stages' },
    {
      $project: {
        stageName: { $ifNull: ['$stages.name', 'Unknown Stage'] },
        stageStatus: { $toUpper: { $ifNull: ['$stages.status', 'UNKNOWN'] } },
      },
    },
    {
      $group: {
        _id: '$stageName',
        totalRuns: { $sum: 1 },
        successes: {
          $sum: {
            $cond: [{ $eq: ['$stageStatus', 'SUCCESS'] }, 1, 0],
          },
        },
        failures: {
          $sum: {
            $cond: [{ $in: ['$stageStatus', FAILED_STAGE_STATUSES] }, 1, 0],
          },
        },
      },
    },
    { $sort: { failures: -1, totalRuns: -1, _id: 1 } },
  ]);
}

async function aggregateFailuresByDate(Model, matchFilter, dateField) {
  return Model.aggregate([
    {
      $match: {
        ...matchFilter,
        [dateField]: {
          $gte: addUtcDays(startOfUtcDay(new Date()), -(TREND_DAYS - 1)),
          $lte: new Date(),
        },
      },
    },
    {
      $project: {
        dateKey: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: `$${dateField}`,
            timezone: UTC_TIMEZONE,
          },
        },
      },
    },
    {
      $group: {
        _id: '$dateKey',
        failures: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
}

async function aggregateTopIssueByDate(Model, matchFilter, dateField) {
  const rows = await Model.aggregate([
    {
      $match: {
        ...matchFilter,
        [dateField]: {
          $gte: addUtcDays(startOfUtcDay(new Date()), -(TREND_DAYS - 1)),
          $lte: new Date(),
        },
      },
    },
    { $unwind: '$stages' },
    {
      $project: {
        dateKey: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: `$${dateField}`,
            timezone: UTC_TIMEZONE,
          },
        },
        stageName: { $ifNull: ['$stages.name', 'Unknown Stage'] },
        stageStatus: { $toUpper: { $ifNull: ['$stages.status', 'UNKNOWN'] } },
      },
    },
    { $match: { stageStatus: { $in: FAILED_STAGE_STATUSES } } },
    {
      $group: {
        _id: {
          date: '$dateKey',
          stage: '$stageName',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.date': 1, count: -1, '_id.stage': 1 } },
  ]);

  const topByDate = new Map();
  for (const row of rows) {
    const date = row?._id?.date;
    if (!date || topByDate.has(date)) continue;
    topByDate.set(date, row?._id?.stage || null);
  }
  return topByDate;
}

function buildSummary({
  totalBuilds,
  successfulBuilds,
  failedBuilds,
  stability,
  mostFailingStage,
  aiConfidence,
  failuresLast7Days,
}) {
  if (totalBuilds <= 0) {
    return 'No completed builds found yet. Run pipelines to generate AI insights.';
  }

  const stageText = mostFailingStage
    ? `Most recurring failures are concentrated in ${mostFailingStage}.`
    : 'No single failing stage dominates recent failures.';

  return `Analyzed ${totalBuilds} completed builds: ${successfulBuilds} successful and ${failedBuilds} failed (${stability}% stability). ${stageText} ${failuresLast7Days} failures were recorded in the last 7 days. Average AI confidence is ${aiConfidence}%.`;
}

function buildSuggestions({
  stability,
  mostFailingStage,
  stageReliability,
  failuresLast7Days,
  aiConfidence,
}) {
  const suggestions = [];

  if (mostFailingStage) {
    suggestions.push(`Prioritize hardening ${mostFailingStage} with targeted validation checks and clearer error logs.`);
  }

  if (stability < 70) {
    suggestions.push(`Pipeline stability is ${stability}%. Focus on repeated failure signatures before expanding deployment scope.`);
  } else if (stability < 85) {
    suggestions.push(`Pipeline stability is ${stability}%. Add stage-level alerting for early failure detection.`);
  }

  const weakestStages = stageReliability
    .filter((stage) => Number(stage.totalRuns) >= 5)
    .sort((a, b) => Number(a.rate) - Number(b.rate))
    .slice(0, 2);

  for (const stage of weakestStages) {
    suggestions.push(`Improve ${stage.name} reliability (${stage.rate}%) by adding retries for transient errors and stricter preconditions.`);
  }

  if (failuresLast7Days >= 5) {
    suggestions.push(`${failuresLast7Days} failures occurred in the last 7 days. Enable rapid rollback or automated rerun policies for flaky failures.`);
  }

  if (aiConfidence < 60) {
    suggestions.push(`Average AI confidence is ${aiConfidence}%. Increase log signal quality and include explicit stage error context in Jenkins output.`);
  }

  if (!suggestions.length) {
    suggestions.push(`Current stability is ${stability}%. Continue monitoring to keep failure rates low as build volume grows.`);
  }

  return suggestions;
}

export async function computeInsights() {
  const rawMatchCompleted = {
    status: { $in: TERMINAL_STATUSES },
    buildStatus: 'COMPLETED',
  };
  const runMatchCompleted = {
    status: { $in: TERMINAL_STATUSES },
  };

  const [
    rawTotalBuilds,
    rawSuccessfulBuilds,
    rawFailedBuilds,
    runTotalBuilds,
    runSuccessfulBuilds,
    runFailedBuilds,
    rawStageStats,
    runStageStats,
    rawFailuresByDate,
    runFailuresByDate,
    rawTopIssueByDate,
    runTopIssueByDate,
    aiConfidenceAgg,
    rawConfidenceAgg,
  ] = await Promise.all([
    PipelineRawLog.countDocuments(rawMatchCompleted),
    PipelineRawLog.countDocuments({ ...rawMatchCompleted, status: { $in: SUCCESS_STATUSES } }),
    PipelineRawLog.countDocuments({ ...rawMatchCompleted, status: { $in: FAILURE_STATUSES } }),
    PipelineRun.countDocuments(runMatchCompleted),
    PipelineRun.countDocuments({ ...runMatchCompleted, status: { $in: SUCCESS_STATUSES } }),
    PipelineRun.countDocuments({ ...runMatchCompleted, status: { $in: FAILURE_STATUSES } }),
    aggregateStageStats(PipelineRawLog, rawMatchCompleted, 'executedAt'),
    aggregateStageStats(PipelineRun, runMatchCompleted, 'executedAt'),
    aggregateFailuresByDate(PipelineRawLog, { status: { $in: FAILURE_STATUSES }, buildStatus: 'COMPLETED' }, 'executedAt'),
    aggregateFailuresByDate(PipelineRun, { status: { $in: FAILURE_STATUSES } }, 'executedAt'),
    aggregateTopIssueByDate(PipelineRawLog, { status: { $in: FAILURE_STATUSES }, buildStatus: 'COMPLETED' }, 'executedAt'),
    aggregateTopIssueByDate(PipelineRun, { status: { $in: FAILURE_STATUSES } }, 'executedAt'),
    PipelineAIAnalysis.aggregate([
      {
        $match: {
          analysisStatus: 'COMPLETED',
          confidenceScore: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: '$confidenceScore' },
        },
      },
    ]),
    PipelineRawLog.aggregate([
      {
        $match: {
          confidenceScore: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: '$confidenceScore' },
        },
      },
    ]),
  ]);

  const hasRawBuildData = rawTotalBuilds > 0;
  const totalBuilds = hasRawBuildData ? rawTotalBuilds : runTotalBuilds;
  const successfulBuilds = hasRawBuildData ? rawSuccessfulBuilds : runSuccessfulBuilds;
  const failedBuilds = hasRawBuildData ? rawFailedBuilds : runFailedBuilds;
  const stability = toPercent(successfulBuilds, totalBuilds);

  const selectedStageStats = hasRawBuildData && rawStageStats.length > 0 ? rawStageStats : runStageStats;
  const stageReliability = selectedStageStats.map((stage) => {
    const totalRuns = toSafeNumber(stage?.totalRuns);
    const successes = toSafeNumber(stage?.successes);
    const failures = toSafeNumber(stage?.failures);
    return {
      name: stage?._id || 'Unknown Stage',
      rate: toPercent(successes, totalRuns),
      failures,
      successes,
      totalRuns,
    };
  });

  stageReliability.sort((a, b) => b.failures - a.failures || a.rate - b.rate || a.name.localeCompare(b.name));

  const mostFailingStage = stageReliability.find((stage) => stage.failures > 0)?.name || null;

  const selectedFailureRows = hasRawBuildData ? rawFailuresByDate : runFailuresByDate;
  const selectedTopIssueMap = hasRawBuildData ? rawTopIssueByDate : runTopIssueByDate;

  const trendByDate = new Map(
    selectedFailureRows.map((row) => [
      row?._id,
      toSafeNumber(row?.failures),
    ])
  );

  const failuresTrend = buildTrendBuckets().map((bucket) => ({
    ...bucket,
    failures: trendByDate.get(bucket.date) || 0,
    topIssue: selectedTopIssueMap.get(bucket.date) || null,
  }));

  const failuresLast7Days = failuresTrend.reduce((sum, item) => sum + toSafeNumber(item.failures), 0);

  const aiFromAnalysis = toSafeNumber(aiConfidenceAgg?.[0]?.avgConfidence, NaN);
  const aiFromRaw = toSafeNumber(rawConfidenceAgg?.[0]?.avgConfidence, NaN);
  const avgAiConfidence = Number.isFinite(aiFromAnalysis)
    ? aiFromAnalysis
    : (Number.isFinite(aiFromRaw) ? aiFromRaw : 0);
  const aiConfidence = Math.max(0, Math.min(100, Math.round(avgAiConfidence * 100)));

  const summary = buildSummary({
    totalBuilds,
    successfulBuilds,
    failedBuilds,
    stability,
    mostFailingStage,
    aiConfidence,
    failuresLast7Days,
  });

  const suggestions = buildSuggestions({
    stability,
    mostFailingStage,
    stageReliability,
    failuresLast7Days,
    aiConfidence,
  });

  return {
    stability,
    mostFailingStage,
    aiConfidence,
    failuresTrend,
    stageReliability,
    summary,
    suggestions,
    meta: {
      totalBuilds,
      successfulBuilds,
      failedBuilds,
      generatedAt: new Date().toISOString(),
      sources: {
        pipelines: 'pipeline_runs',
        failures: 'pipeline_ai_analysis',
        executions: 'pipeline_raw_logs',
      },
    },
  };
}

export default { computeInsights };
=======
import PipelineRawLog from '../models/PipelineRawLog.js';
import { getHistory, getFailuresTimeline } from './pipelineDataService.js';

const FAILURE_STATUSES = ['FAILURE', 'FAILED'];
const SUCCESS_STATUSES = ['SUCCESS'];

function normalizeStatus(status) {
  return String(status || '').toUpperCase();
}

export async function computeInsightsOverview(options = {}) {
  const windowSize = Number(options.windowSize) || 50;
  const days = Number(options.days) || 7;

  // Use existing history helper that already joins AI analysis with raw logs
  const history = await getHistory(windowSize).catch((err) => {
    console.error('[insights] getHistory failed:', err?.message || err);
    return [];
  });

  const totalRuns = Array.isArray(history) ? history.length : 0;

  let successCount = 0;
  let failureCount = 0;
  const stageFailCounts = new Map();
  const failuresByDay = new Map(); // key: YYYY-MM-DD -> { count, stages: Map(stage -> count) }

  for (const run of history) {
    const status = normalizeStatus(run?.status);
    if (SUCCESS_STATUSES.includes(status)) successCount += 1;
    else if (FAILURE_STATUSES.includes(status)) failureCount += 1;

    if (FAILURE_STATUSES.includes(status)) {
      const stage = run?.failedStage || 'Unknown';
      stageFailCounts.set(stage, (stageFailCounts.get(stage) || 0) + 1);

      const executedAt = run?.executedAt ? new Date(run.executedAt) : null;
      if (executedAt && !Number.isNaN(executedAt.getTime())) {
        const key = executedAt.toISOString().slice(0, 10); // YYYY-MM-DD
        let bucket = failuresByDay.get(key);
        if (!bucket) {
          bucket = { count: 0, stages: new Map() };
          failuresByDay.set(key, bucket);
        }
        bucket.count += 1;
        const stageKey = stage || 'Unknown';
        bucket.stages.set(stageKey, (bucket.stages.get(stageKey) || 0) + 1);
      }
    }
  }

  const countedRuns = successCount + failureCount;
  const stability = countedRuns > 0 ? Math.round((successCount / countedRuns) * 100) : 0;

  let mostFailingStage = null;
  let mostFailingStageCount = 0;
  for (const [stage, count] of stageFailCounts.entries()) {
    if (count > mostFailingStageCount) {
      mostFailingStageCount = count;
      mostFailingStage = stage;
    }
  }

  // Build failures trend for the last N days (inclusive of today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const failuresTrend = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const bucket = failuresByDay.get(key);

    let topIssue = null;
    if (bucket && bucket.stages && bucket.stages.size) {
      let max = 0;
      for (const [stage, count] of bucket.stages.entries()) {
        if (count > max) {
          max = count;
          topIssue = stage;
        }
      }
    }

    failuresTrend.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: key,
      failures: bucket ? bucket.count : 0,
      topIssue: topIssue || null,
    });
  }

  // Stage reliability based on last N raw builds and their stages
  const rawBuilds = await PipelineRawLog.find()
    .sort({ executedAt: -1 })
    .limit(windowSize)
    .lean()
    .catch((err) => {
      console.error('[insights] PipelineRawLog.find failed:', err?.message || err);
      return [];
    });

  const stageCounts = new Map(); // stageName -> { total, failures }
  for (const raw of rawBuilds) {
    const stages = Array.isArray(raw?.stages) ? raw.stages : [];
    for (const s of stages) {
      const name = s?.name || 'Unknown';
      const key = name;
      const bucket = stageCounts.get(key) || { total: 0, failures: 0 };
      bucket.total += 1;
      const stageStatus = normalizeStatus(s?.status);
      const isSuccess = stageStatus.includes('SUCCESS') || stageStatus === 'SUCCESS' || stageStatus === 'PASSED';
      const isFailure = stageStatus.includes('FAIL') || stageStatus.includes('ERROR');
      if (isFailure || (!isSuccess && stageStatus && stageStatus !== 'SKIPPED')) {
        bucket.failures += 1;
      }
      stageCounts.set(key, bucket);
    }
  }

  const stageStats = Array.from(stageCounts.entries())
    .map(([name, stats]) => {
      const total = stats.total || 0;
      const failures = stats.failures || 0;
      const successes = Math.max(total - failures, 0);
      const rate = total > 0 ? Math.round((successes / total) * 100) : 0;
      return { name, rate, failures };
    })
    // Show most problematic stages first
    .sort((a, b) => a.rate - b.rate);

  // AI confidence from recent history (confidenceScore is 0-1)
  let confidenceSum = 0;
  let confidenceCount = 0;
  for (const run of history) {
    const c = typeof run?.confidenceScore === 'number' ? run.confidenceScore : null;
    if (c != null) {
      confidenceCount += 1;
      confidenceSum += c;
    }
  }
  const aiConfidence = confidenceCount > 0 ? Math.round((confidenceSum / confidenceCount) * 100) : 0;

  // Suggestions derived from grouped failures timeline (stage + error patterns)
  const failuresTimeline = await getFailuresTimeline(windowSize).catch((err) => {
    console.error('[insights] getFailuresTimeline failed:', err?.message || err);
    return [];
  });

  const suggestions = failuresTimeline.slice(0, 3).map((group) => {
    const stage = group?.failedStage || 'Unknown stage';
    const error = group?.detectedError || 'Unknown error pattern';
    const occurrences = group?.occurrences || 0;
    const confidenceAvg = typeof group?.confidenceAvg === 'number' ? group.confidenceAvg : null;

    const title = stage && stage !== 'Unknown stage'
      ? `Frequent failures in ${stage}`
      : 'Frequent pipeline failures detected';

    const causes = [
      error,
      `Seen ${occurrences} time${occurrences === 1 ? '' : 's'} in recent runs`,
    ];

    const fix = 'Inspect the recent failed builds for this stage, review AI analysis details, and apply the recommended fixes in the build view.';

    return {
      title,
      causes,
      fix,
      stage: group?.failedStage || null,
      error: group?.detectedError || null,
      occurrences,
      confidenceAvg,
    };
  });

  const summary = totalRuns === 0
    ? 'No recent pipeline runs available to generate AI insights.'
    : `Over the last ${totalRuns} runs, pipeline stability is ${stability}%, with most failures occurring in ${mostFailingStage || 'unknown stage'}. AI analysis confidence across recent runs is approximately ${aiConfidence}%.`;

  return {
    stability,
    totalRuns,
    successCount,
    failureCount,
    mostFailingStage: mostFailingStage || null,
    aiConfidence,
    failuresTrend,
    stageStats,
    suggestions,
    summary,
  };
}

export default { computeInsightsOverview };
>>>>>>> 526fa79 (fix: scalaton loading & jenkins config)
