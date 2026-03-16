import PipelineRawLog from "../models/PipelineRawLog.js";
import PipelineRun from "../models/PipelineRun.js";

// Derive a latest pipeline run summary from raw logs; caches into PipelineRun
export async function getLatestPipelineRun() {
  console.log("Reconstructing pipeline runs from raw logs");

  // First try the cache
  const cached = await PipelineRun.findOne().sort({ buildNumber: -1, createdAt: -1 }).lean();
  if (cached) return cached;

  // Aggregate from raw logs when cache is empty
  const agg = await PipelineRawLog.aggregate([
    {
      $group: {
        _id: "$buildNumber",
        jobName: { $first: "$jobName" },
        status: { $last: "$status" },
        durationSeconds: { $max: "$durationSeconds" },
        startedAt: { $min: "$executedAt" },
        finishedAt: { $max: "$updatedAt" },
        stages: { $push: "$stages" },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: 1 },
  ]);

  const doc = agg?.[0];
  if (!doc) return null;

  const flattenedStages = Array.from(new Set((doc.stages || []).flat().map((s) => s?.name).filter(Boolean)));
  const durationMs = Number.isFinite(doc.durationSeconds) ? doc.durationSeconds * 1000 : null;
  const finishedAt = doc.finishedAt || (doc.startedAt ? new Date(new Date(doc.startedAt).getTime() + (durationMs || 0)) : null);

  const summary = {
    jobName: doc.jobName,
    buildNumber: doc._id,
    status: doc.status || "UNKNOWN",
    duration: durationMs,
    startedAt: doc.startedAt || null,
    finishedAt,
    stages: flattenedStages,
  };

  // Cache for fast subsequent reads
  await PipelineRun.findOneAndUpdate(
    { jobName: summary.jobName, buildNumber: summary.buildNumber },
    { $set: summary },
    { upsert: true, new: true }
  );

  return summary;
}

export default { getLatestPipelineRun };
