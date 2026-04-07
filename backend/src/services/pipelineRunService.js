import PipelineRawLog from "../models/PipelineRawLog.js";
import PipelineRun from "../models/PipelineRun.js";

function deriveSummary(raw) {
  if (!raw) return null;
  const startedAt = raw.executedAt || raw.createdAt || new Date();
  const durationMs = Number.isFinite(raw.durationSeconds) ? raw.durationSeconds * 1000 : null;
  const finishedAt = durationMs != null ? new Date(new Date(startedAt).getTime() + durationMs) : (raw.updatedAt || startedAt);
  return {
    jobName: raw.jobName,
    buildNumber: raw.buildNumber,
    status: raw.status || "UNKNOWN",
    stages: Array.isArray(raw.stages) ? raw.stages : [],
    duration: durationMs,
    startedAt,
    finishedAt,
    executedAt: finishedAt || startedAt,
    failedStage: Array.isArray(raw.stages) ? (raw.stages.find((s) => s?.status === "FAILED")?.name || null) : null,
    logs: typeof raw.logs === 'string' ? raw.logs : (typeof raw.rawLogs === 'string' ? raw.rawLogs : ''),
  };
}

export async function upsertPipelineRunFromRaw(raw) {
  const summary = deriveSummary(raw);
  if (!summary) return null;
  const doc = await PipelineRun.findOneAndUpdate(
    { jobName: summary.jobName, buildNumber: summary.buildNumber },
    { $set: summary },
    { upsert: true, new: true }
  );
  return doc;
}

export async function backfillPipelineRunsFromRawLogs() {
  const existingRuns = await PipelineRun.countDocuments();
  if (existingRuns > 0) return { created: 0, skipped: true };

  const raws = await PipelineRawLog.find({}).sort({ executedAt: 1 }).lean();
  let created = 0;
  for (const raw of raws) {
    await upsertPipelineRunFromRaw(raw);
    created += 1;
  }
  return { created, skipped: false };
}

export default { upsertPipelineRunFromRaw, backfillPipelineRunsFromRawLogs };
