import PipelineRawLog from '../models/PipelineRawLog.js';
import PipelineAIAnalysis from '../models/PipelineAIAnalysis.js';
import { decodeJenkinsConsole } from './logDecoder.js';

export async function getLatestWithAnalysis() {
  const raw = await PipelineRawLog.findOne().sort({ executedAt: -1 }).lean();
  if (!raw) return null;
  const ai = await PipelineAIAnalysis.findOne({ jobName: raw.jobName, buildNumber: raw.buildNumber })
    .sort({ updatedAt: -1 })
    .lean();
  return { raw, ai };
}

// Latest failed builds for "Recent Failures" and failures page.
// MongoDB is the single source of truth: we read directly from PipelineRawLog
// and join the latest AI analysis per (jobName, buildNumber).
export async function getLatestFailures(limit = 10) {
  const n = Number(limit) || 10;

  const raws = await PipelineRawLog.find({ status: 'FAILURE' })
    .sort({ buildNumber: -1, executedAt: -1 })
    .limit(n)
    .lean();

  if (!raws.length) return [];

  const keys = raws.map((r) => ({ jobName: r.jobName, buildNumber: r.buildNumber }));
  const jobNames = Array.from(new Set(keys.map((k) => k.jobName)));
  const buildNumbers = Array.from(new Set(keys.map((k) => k.buildNumber)));

  const aiDocs = await PipelineAIAnalysis.find({
    jobName: { $in: jobNames },
    buildNumber: { $in: buildNumbers },
  })
    .sort({ generatedAt: -1 })
    .lean();

  const latestAIByKey = new Map();
  for (const a of aiDocs) {
    const key = `${a.jobName}#${a.buildNumber}`;
    if (!latestAIByKey.has(key)) latestAIByKey.set(key, a);
  }

  return raws.map((r) => {
    const a = latestAIByKey.get(`${r.jobName}#${r.buildNumber}`);
    const shortCommit = r.commit ? String(r.commit).slice(0, 7) : null;
    const duration = Number.isFinite(r.durationSeconds) ? `${r.durationSeconds}s` : null;
    return {
      jobName: r.jobName,
      buildNumber: r.buildNumber,
      status: r.status,
      executedAt: r.executedAt,
      failedStage: a?.failedStage ?? null,
      detectedError: a?.detectedError ?? null,
      confidenceScore: a?.confidenceScore ?? 0,
      branch: r.branch || null,
      commit: shortCommit,
      duration,
    };
  });
}

export async function getHistory(limit = 50) {
  const n = limit === 'all' ? 1000 : Number(limit) || 50;
  const raws = await PipelineRawLog.find().sort({ executedAt: -1 }).limit(n).lean();
  const byKey = new Map(raws.map((r) => [`${r.jobName}#${r.buildNumber}`, r]));
  const aiDocs = await PipelineAIAnalysis.find({
    jobName: { $in: raws.map((r) => r.jobName) },
    buildNumber: { $in: raws.map((r) => r.buildNumber) },
  })
    .sort({ generatedAt: -1 })
    .lean();
  const latestAIByKey = new Map();
  for (const a of aiDocs) {
    const key = `${a.jobName}#${a.buildNumber}`;
    if (!latestAIByKey.has(key)) latestAIByKey.set(key, a);
  }
  return raws.map((r) => {
    const a = latestAIByKey.get(`${r.jobName}#${r.buildNumber}`);
    const shortCommit = r.commit ? String(r.commit).slice(0, 7) : null;
    const duration = Number.isFinite(r.durationSeconds) ? `${r.durationSeconds}s` : null;
    return {
      jobName: r.jobName,
      buildNumber: r.buildNumber,
      status: r.status,
      executedAt: r.executedAt,
      failedStage: a?.failedStage ?? null,
      detectedError: a?.detectedError ?? null,
      confidenceScore: a?.confidenceScore ?? 0,
      branch: r.branch || null,
      commit: shortCommit,
      duration,
    };
  });
}

export async function getBuildWithAnalysis(buildNumber) {
  const raw = await PipelineRawLog.findOne({ buildNumber }).lean();
  if (!raw) return null;
  const ai = await PipelineAIAnalysis.findOne({ jobName: raw.jobName, buildNumber })
    .sort({ generatedAt: -1 })
    .lean();
  return { raw, ai };
}

export async function getRawLogs(buildNumber) {
  const raw = await PipelineRawLog.findOne({ buildNumber }).lean();
  if (!raw) return null;
  // For detection only, compute a cleaned version; return original unfiltered logs to UI
  const cleaned = decodeJenkinsConsole(raw.rawLogs || '');
  const isCompilationFailure =
    raw.status === 'FAILURE' && (!raw.stages || raw.stages.length === 0) && (!cleaned || cleaned.trim().length === 0);
  const placeholder =
    'No runtime logs available. The pipeline failed during Jenkinsfile parsing before execution started.';
  const outLogs = isCompilationFailure ? placeholder : (raw.rawLogs || '');
  return { rawLogs: outLogs, consoleUrl: raw.consoleUrl, executedAt: raw.executedAt };
}

export async function getFailuresTimeline(limit = 50) {
  const history = await getHistory(limit);
  // Group by failedStage + detectedError
  const groups = new Map();
  for (const item of history) {
    const key = `${item.failedStage || 'UNKNOWN'}|${item.detectedError || 'UNKNOWN'}`;
    const arr = groups.get(key) || [];
    arr.push(item);
    groups.set(key, arr);
  }
  const timeline = [];
  for (const [key, items] of groups.entries()) {
    const [stage, error] = key.split('|');
    timeline.push({
      failedStage: stage === 'UNKNOWN' ? null : stage,
      detectedError: error === 'UNKNOWN' ? null : error,
      occurrences: items.length,
      latestBuildNumber: items[0]?.buildNumber,
      latestExecutedAt: items[0]?.executedAt,
      confidenceAvg: Number(
        (
          items.reduce((sum, it) => sum + (it.confidenceScore || 0), 0) / Math.max(items.length, 1)
        ).toFixed(2)
      ),
    });
  }
  // Sort by latest build number desc
  timeline.sort((a, b) => (b.latestBuildNumber || 0) - (a.latestBuildNumber || 0));
  return timeline;
}

export default {
  getLatestWithAnalysis,
  getHistory,
  getBuildWithAnalysis,
  getRawLogs,
  getFailuresTimeline,
  getLatestFailures,
};

export async function reanalyzeBuild(buildNumber, options = {}) {
  const raw = await PipelineRawLog.findOne({ buildNumber }).lean();
  if (!raw) return null;
  // Re-fetch full document for _id
  const rawDoc = await PipelineRawLog.findById(raw._id);
  // Only reanalyze failed builds
  if (raw.status !== 'FAILURE') {
    return { aiAnalysis: { skipped: true, reason: 'NO_FAILURE_DETECTED' }, buildNumber };
  }
  // Import here to avoid circular deps if any
  const { storeAIAnalysisForRawLog } = await import('./openaiService.js');
  const analysis = await storeAIAnalysisForRawLog(rawDoc, options);
  return analysis;
}
