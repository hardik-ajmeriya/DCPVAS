// In-memory tracker for AI analysis progress per job/build.
// Not persisted to MongoDB to avoid schema changes.

const progressMap = new Map(); // key: `${jobName}#${buildNumber}` -> { step, startedAt }

export function setProgress(jobName, buildNumber, step) {
  const key = `${jobName}#${buildNumber}`;
  const existing = progressMap.get(key) || {};
  progressMap.set(key, { step, startedAt: existing.startedAt || new Date() });
}

export function getProgress(jobName, buildNumber) {
  const key = `${jobName}#${buildNumber}`;
  return progressMap.get(key) || null;
}

export function clearProgress(jobName, buildNumber) {
  const key = `${jobName}#${buildNumber}`;
  progressMap.delete(key);
}

export default { setProgress, getProgress, clearProgress };
