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
    return {
      jobName: r.jobName,
      buildNumber: r.buildNumber,
      status: r.status,
      executedAt: r.executedAt,
      failedStage: a?.failedStage ?? null,
      detectedError: a?.detectedError ?? null,
      confidenceScore: a?.confidenceScore ?? 0,
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
  // Ensure any legacy stored logs are cleaned before returning
  const text = decodeJenkinsConsole(raw.rawLogs || '');
  return { rawLogs: text, consoleUrl: raw.consoleUrl, executedAt: raw.executedAt };
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
};

export async function reanalyzeBuild(buildNumber, options = {}) {
  const raw = await PipelineRawLog.findOne({ buildNumber }).lean();
  if (!raw) return null;
  // Re-fetch full document for _id
  const rawDoc = await PipelineRawLog.findById(raw._id);
  // Import here to avoid circular deps if any
  const { storeAIAnalysisForRawLog } = await import('./openaiService.js');
  const analysis = await storeAIAnalysisForRawLog(rawDoc, options);
  return analysis;
}
