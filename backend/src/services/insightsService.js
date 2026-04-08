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
