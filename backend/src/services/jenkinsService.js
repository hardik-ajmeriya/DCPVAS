// Live Jenkins integration using Jenkins Remote API with polling
// SECURITY: Credentials are stored only in backend environment variables.
// Jenkins runs pipelines; this service only reads data for monitoring/analysis.

import axios from 'axios';
import { cleanJenkinsLogs } from './logSanitizer.js';
import { decodeJenkinsConsole } from './logDecoder.js';
import PipelineRawLog from '../models/PipelineRawLog.js';
import PipelineAIAnalysis from '../models/PipelineAIAnalysis.js';
import { storeAIAnalysisForRawLog } from './openaiService.js';

function getEnv() {
  return {
    JENKINS_URL: process.env.JENKINS_URL,
    JENKINS_JOB: process.env.JENKINS_JOB,
    JENKINS_USER: process.env.JENKINS_USER,
    JENKINS_TOKEN: process.env.JENKINS_TOKEN,
  };
}

export function isLiveEnabled() {
  const { JENKINS_URL, JENKINS_JOB, JENKINS_USER, JENKINS_TOKEN } = getEnv();
  return !!(JENKINS_URL && JENKINS_JOB && JENKINS_USER && JENKINS_TOKEN);
}

function getEnvStatus() {
  const { JENKINS_URL, JENKINS_JOB, JENKINS_USER, JENKINS_TOKEN } = getEnv();
  return {
    hasUrl: !!JENKINS_URL,
    hasJob: !!JENKINS_JOB,
    hasUser: !!JENKINS_USER,
    hasToken: !!JENKINS_TOKEN,
  };
}

function getClient() {
  const { JENKINS_URL, JENKINS_USER, JENKINS_TOKEN } = getEnv();
  return axios.create({
    baseURL: JENKINS_URL,
    auth: { username: JENKINS_USER || '', password: JENKINS_TOKEN || '' },
    timeout: 15000,
  });
}

// In-memory cache for near real-time monitoring
let cache = {
  lastUpdated: null,
  buildNumber: null,
  latest: null, // normalized run object
  logs: '',
  stages: [],
};

function normalizeBuild(json) {
  if (!json) return null;
  const status = json.result || (json.building ? 'BUILDING' : 'UNKNOWN');
  return {
    id: `jenkins-${json.number}`,
    buildNumber: json.number,
    status: status === 'SUCCESS' ? 'SUCCESS' : status === 'FAILURE' ? 'FAILED' : status,
    startedAt: json.timestamp ? new Date(json.timestamp).toISOString() : null,
    durationMs: json.duration || 0,
    stages: [], // populated later
  };
}

function buildJobPath() {
  const { JENKINS_JOB } = getEnv();
  const parts = (JENKINS_JOB || '').split('/').filter(Boolean);
  return parts.map((p) => `/job/${encodeURIComponent(p)}`).join('');
}

async function fetchLatestBuildJson() {
  const url = `${buildJobPath()}/lastBuild/api/json`;
  const { data } = await getClient().get(url);
  return data;
}

async function fetchRecentBuildsJson(limit = 50) {
  // Fetch builds list; Jenkins supports tree filtering. We'll fetch full list and slice in JS.
  const tree = `builds[number,result,building,timestamp,duration]`;
  const url = `${buildJobPath()}/api/json?tree=${encodeURIComponent(tree)}`;
  const { data } = await getClient().get(url);
  const builds = Array.isArray(data?.builds) ? data.builds : [];
  if (limit === 'all') return builds;
  const n = typeof limit === 'number' ? limit : 50;
  return builds.slice(0, n);
}

async function fetchFullLog(buildNumber) {
  // Fetch from /consoleText as plain text, with identity encoding
  const url = `${buildJobPath()}/${buildNumber}/consoleText`;
  const res = await getClient().get(url, {
    responseType: 'text',
    transformResponse: [(d) => d],
    headers: { 'Accept': 'text/plain', 'Accept-Encoding': 'identity' },
  });
  const content = res.data || '';
  // Log first 10 lines for validation
  try {
    const preview = String(content).split(/\r?\n/).slice(0, 10).join('\n');
    console.log('[Jenkins consoleText preview]\n' + preview);
  } catch {}
  return content;
}

async function fetchStages(buildNumber) {
  try {
    const url = `${buildJobPath()}/${buildNumber}/wfapi/describe`;
    const { data } = await getClient().get(url);
    const stages = (data.stages || []).map((s) => ({
      name: s.name,
      status: s.status === 'SUCCESS' ? 'SUCCESS' : s.status === 'FAILED' ? 'FAILED' : s.status,
      durationMs: s.durationMillis || 0,
    }));
    if (stages.length) return stages;
  } catch {
    // fall through to log-based parsing
  }
  // Fallback: derive stages from real console logs (no mock data)
  const logs = await fetchFullLog(buildNumber);
  return parseStagesFromLogs(logs);
}

function parseStagesFromLogs(logText) {
  if (!logText) return [];
  const ansiStripped = cleanJenkinsLogs(logText);
  const lines = ansiStripped.split(/\r?\n/);
  const stages = [];
  let current = null;
  for (const line of lines) {
    const openMatch = line.match(/\[Pipeline\]\s*\{\s*\((.+?)\)/);
    if (openMatch) {
      // Close any previous stage optimistically
      if (current) stages.push(current);
      current = { name: openMatch[1].trim(), status: 'SUCCESS', durationMs: 0 };
      continue;
    }
    if (/\[Pipeline\]\s*\/\/\s*stage/.test(line) || /\[Pipeline\]\s*\}/.test(line)) {
      if (current) {
        stages.push(current);
        current = null;
      }
      continue;
    }
    if (current) {
      if (/Finished:\s*FAILURE/i.test(line) || /FAILED\s*stage/i.test(line) || /\berror\b/i.test(line)) {
        current.status = 'FAILED';
      }
      if (/skipped\s+due\s+to\s+earlier\s+failure\(s\)/i.test(line) || /\bskipped\b/i.test(line)) {
        // If the stage is explicitly marked as skipped
        current.status = 'SKIPPED';
      }
    }
  }
  // In case the last stage never saw a close marker
  if (current) stages.push(current);
  return stages;
}

async function updateCacheOnce() {
  if (!isLiveEnabled()) {
    console.log('Jenkins env missing:', getEnvStatus());
    throw new Error('Jenkins environment variables not fully configured');
  }
  console.log('Fetching Jenkins job:', getEnv().JENKINS_JOB);
  const latestJson = await fetchLatestBuildJson();
  const normalized = normalizeBuild(latestJson);
  if (normalized?.buildNumber != null) {
    console.log('Build number:', normalized.buildNumber);
  }
  let logs = cache.logs;
  let stages = cache.stages;
  if (normalized && normalized.buildNumber !== cache.buildNumber) {
    logs = await fetchFullLog(normalized.buildNumber);
    // Remove Jenkins console notes / transport artifacts
    logs = decodeJenkinsConsole(logs);
    stages = await fetchStages(normalized.buildNumber);
  }
  cache = {
    lastUpdated: new Date().toISOString(),
    buildNumber: normalized?.buildNumber ?? cache.buildNumber,
    latest: { ...normalized, stages },
    logs,
    stages,
  };

  // Persist original Jenkins data to pipeline_raw_logs (insert once per build)
  try {
    if (normalized && normalized.buildNumber != null) {
      const statusNorm = normalized.status === 'FAILED' ? 'FAILURE' : normalized.status === 'SUCCESS' ? 'SUCCESS' : normalized.status;
      // Only save once job is complete (SUCCESS or FAILURE)
      if (statusNorm === 'SUCCESS' || statusNorm === 'FAILURE') {
        const jobName = getEnv().JENKINS_JOB || 'unknown-job';
        const exists = await PipelineRawLog.findOne({ jobName, buildNumber: normalized.buildNumber }).lean();
        if (!exists) {
          const consoleUrl = `${getEnv().JENKINS_URL}${buildJobPath()}/${normalized.buildNumber}/console`;
          const rawDoc = await PipelineRawLog.create({
            jobName,
            buildNumber: normalized.buildNumber,
            status: statusNorm,
            stages,
            // Store cleaned, human-readable logs (strip Jenkins console notes)
            rawLogs: decodeJenkinsConsole(logs || ''),
            consoleUrl,
            executedAt: new Date(),
          });
          console.log(`Saved raw logs ${jobName} #${normalized.buildNumber} (${statusNorm})`);
          // Fire-and-forget async AI analysis; do not block polling
          Promise.resolve()
            .then(() => storeAIAnalysisForRawLog(rawDoc))
            .catch((err) => {
              console.error('AI analysis scheduling failed:', err?.message || err);
            });
        }
      }
    }
  } catch (e) {
    // Ignore duplicate key or transient DB errors to keep polling resilient
    if (e?.code === 11000) {
      // duplicate key
    } else {
      console.error('Failed to persist execution:', e?.message || e);
    }
  }
  return cache;
}

let pollerStarted = false;
function startPoller(intervalMs = 12000) {
  if (!isLiveEnabled() || pollerStarted) return;
  pollerStarted = true;
  updateCacheOnce().catch(() => {});
  setInterval(() => {
    updateCacheOnce().catch(() => {});
  }, intervalMs);
}

export function initJenkinsPolling() {
  startPoller();
  // Also ensure any previously stored raw logs without AI analysis get processed
  ensureMissingAnalysesScheduled().catch(() => {});
  setInterval(() => ensureMissingAnalysesScheduled().catch(() => {}), 30000);
}

export async function getLatestCached() {
  if (!isLiveEnabled()) {
    console.error('Jenkins env missing:', getEnvStatus());
    throw new Error('Jenkins environment variables not fully configured');
  }
  if (!cache.lastUpdated) await updateCacheOnce();
  return cache;
}

export const __testOnly = { normalizeBuild, fetchFullLog, fetchStages };

export async function getRecentBuilds(limit = 50) {
  if (!isLiveEnabled()) {
    console.log('Jenkins env missing:', getEnvStatus());
    throw new Error('Jenkins environment variables not fully configured');
  }
  const builds = await fetchRecentBuildsJson(limit);
  return builds
    .map((b) => {
      const run = normalizeBuild(b);
      if (!run) return null;
      return {
        ...run,
        jobName: getEnv().JENKINS_JOB || 'unknown-job',
        consoleUrl: `${getEnv().JENKINS_URL}${buildJobPath()}/${b.number}/console`,
      };
    })
    .filter(Boolean);
}

export async function getBuildDetails(buildNumber) {
  if (!isLiveEnabled()) {
    console.log('Jenkins env missing:', getEnvStatus());
    throw new Error('Jenkins environment variables not fully configured');
  }
  console.log('Fetching Jenkins job:', getEnv().JENKINS_JOB);
  console.log('Build number:', buildNumber);
  const url = `${buildJobPath()}/${buildNumber}/api/json`;
  const { data } = await getClient().get(url);
  const run = normalizeBuild(data);
  let logs = await fetchFullLog(buildNumber);
  logs = decodeJenkinsConsole(logs);
  const stages = await fetchStages(buildNumber);
  return {
    lastUpdated: new Date().toISOString(),
    latest: { ...run, stages, consoleUrl: `${getEnv().JENKINS_URL}${buildJobPath()}/${buildNumber}/console` },
    logs,
    stages,
  };
}

// Scan recent raw logs and schedule AI analysis for any missing entries
async function ensureMissingAnalysesScheduled() {
  try {
    const raws = await PipelineRawLog.find().sort({ executedAt: -1 }).limit(5);
    for (const raw of raws) {
      const ai = await PipelineAIAnalysis.findOne({ jobName: raw.jobName, buildNumber: raw.buildNumber }).sort({ updatedAt: -1 }).lean();
      if (!ai) {
        console.log(`[AI] Scheduling missing analysis for build #${raw.buildNumber}`);
        await storeAIAnalysisForRawLog(raw);
      }
    }
  } catch (err) {
    console.error('Failed to schedule missing analyses:', err?.message || err);
  }
}
