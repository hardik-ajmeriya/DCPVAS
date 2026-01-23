// Live Jenkins integration using Jenkins Remote API with polling
// SECURITY: Credentials are stored only in backend environment variables.
// Jenkins runs pipelines; this service only reads data for monitoring/analysis.

import axios from 'axios';
import { cleanJenkinsLogs } from './logSanitizer.js';
import { decodeJenkinsConsole } from './logDecoder.js';
import PipelineRawLog from '../models/PipelineRawLog.js';
import PipelineAIAnalysis from '../models/PipelineAIAnalysis.js';
import { storeAIAnalysisForRawLog } from './openaiService.js';
import JenkinsSettings from '../models/jenkinsSettings.js';
import { decrypt } from './cryptoService.js';

// Optional Socket.IO instance for emitting real-time events
let io = null;
export function setSocketIO(socketInstance) {
  io = socketInstance || null;
}

export async function getJenkinsConfig() {
  const settings = await JenkinsSettings.findOne();
  if (!settings) throw new Error('Jenkins not configured');

  return {
    baseUrl: settings.jenkinsUrl,
    jobName: settings.jobName,
    auth: {
      username: settings.username,
      password: decrypt(settings.apiToken),
    },
  };
}

// Keep existing signature for external callers (diagnostics), but internal logic uses DB config.
export function isLiveEnabled() {
  const { JENKINS_URL, JENKINS_JOB, JENKINS_USER, JENKINS_TOKEN } = {
    JENKINS_URL: process.env.JENKINS_URL,
    JENKINS_JOB: process.env.JENKINS_JOB,
    JENKINS_USER: process.env.JENKINS_USER,
    JENKINS_TOKEN: process.env.JENKINS_TOKEN,
  };
  return !!(JENKINS_URL && JENKINS_JOB && JENKINS_USER && JENKINS_TOKEN);
}

async function getClient() {
  const cfg = await getJenkinsConfig();
  return axios.create({
    baseURL: cfg.baseUrl,
    auth: { username: cfg.auth.username || '', password: cfg.auth.password || '' },
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

async function buildJobPath() {
  const { jobName } = await getJenkinsConfig();
  const parts = (jobName || '').split('/').filter(Boolean);
  return parts.map((p) => `/job/${encodeURIComponent(p)}`).join('');
}

async function fetchLatestBuildJson() {
  const url = `${await buildJobPath()}/lastBuild/api/json`;
  const client = await getClient();
  const { data } = await client.get(url);
  return data;
}

async function fetchRecentBuildsJson(limit = 50) {
  // Fetch builds list; Jenkins supports tree filtering. We'll fetch full list and slice in JS.
  const tree = `builds[number,result,building,timestamp,duration]`;
  const url = `${await buildJobPath()}/api/json?tree=${encodeURIComponent(tree)}`;
  const client = await getClient();
  const { data } = await client.get(url);
  const builds = Array.isArray(data?.builds) ? data.builds : [];
  if (limit === 'all') return builds;
  const n = typeof limit === 'number' ? limit : 50;
  return builds.slice(0, n);
}

async function fetchFullLog(buildNumber) {
  // Fetch from /consoleText as plain text, with identity encoding
  const url = `${await buildJobPath()}/${buildNumber}/consoleText`;
  const client = await getClient();
  const res = await client.get(url, {
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
    const url = `${await buildJobPath()}/${buildNumber}/wfapi/describe`;
    const client = await getClient();
    const { data } = await client.get(url);
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
  // Validate DB-backed Jenkins config
  const cfg = await getJenkinsConfig();
  console.log('Fetching Jenkins job:', cfg.jobName);
  const latestJson = await fetchLatestBuildJson();
  const normalized = normalizeBuild(latestJson);
  if (normalized?.buildNumber != null) {
    console.log('Build number:', normalized.buildNumber);
  }
  let logs = cache.logs;
  let stages = cache.stages;
  if (normalized && normalized.buildNumber !== cache.buildNumber) {
    // New build detected → emit build:new event
    if (io) {
      try {
        io.emit('build:new', { jobName: cfg.jobName || 'unknown-job', buildNumber: normalized.buildNumber });
      } catch {}
    }
    const originalLogs = await fetchFullLog(normalized.buildNumber);
    logs = originalLogs; // Keep raw logs for UI; do not filter here
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
        const jobName = cfg.jobName || 'unknown-job';
        const exists = await PipelineRawLog.findOne({ jobName, buildNumber: normalized.buildNumber }).lean();
        if (!exists) {
          const consoleUrl = `${cfg.baseUrl}${await buildJobPath()}/${normalized.buildNumber}/console`;
          const rawDoc = await PipelineRawLog.create({
            jobName,
            buildNumber: normalized.buildNumber,
            status: statusNorm,
            stages,
            // Store original Jenkins console text unfiltered for UI
            rawLogs: logs || '',
            consoleUrl,
            executedAt: new Date(),
          });
          console.log(`Saved raw logs ${jobName} #${normalized.buildNumber} (${statusNorm})`);
          // Schedule AI analysis ONLY for failures
          if (statusNorm === 'FAILURE') {
            Promise.resolve()
              .then(() => storeAIAnalysisForRawLog(rawDoc, { io }))
              .catch((err) => {
                console.error('AI analysis scheduling failed:', err?.message || err);
              });
          } else if (statusNorm === 'SUCCESS') {
            // Emit success event to update frontend instantly
            try {
              io?.emit('build:success', { buildNumber: normalized.buildNumber });
            } catch {}
          }
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
async function startPoller(intervalMs = 30000) {
  if (pollerStarted) return;
  // Ensure Jenkins is configured in DB
  try {
    await getJenkinsConfig();
  } catch {
    return;
  }
  pollerStarted = true;
  updateCacheOnce().catch(() => {});
  setInterval(() => {
    updateCacheOnce().catch(() => {});
  }, intervalMs);
}

export function initJenkinsPolling(intervalMs = 30000) {
  // Start background watcher that periodically checks Jenkins for latest build
  // Default interval respects Jenkins load constraints (30s)
  startPoller(intervalMs);
  // Also ensure any previously stored raw logs without AI analysis get processed
  ensureMissingAnalysesScheduled().catch(() => {});
  setInterval(() => ensureMissingAnalysesScheduled().catch(() => {}), 30000);
}

export async function getLatestCached() {
  // Throws if Jenkins isn't configured in DB
  await getJenkinsConfig();
  if (!cache.lastUpdated) await updateCacheOnce();
  return cache;
}

export const __testOnly = { normalizeBuild, fetchFullLog, fetchStages };

export async function getRecentBuilds(limit = 50) {
  const cfg = await getJenkinsConfig();
  const builds = await fetchRecentBuildsJson(limit);
  const jobPath = await buildJobPath();
  return builds
    .map((b) => {
      const run = normalizeBuild(b);
      if (!run) return null;
      return {
        ...run,
        jobName: cfg.jobName || 'unknown-job',
        consoleUrl: `${cfg.baseUrl}${jobPath}/${b.number}/console`,
      };
    })
    .filter(Boolean);
}

export async function getBuildDetails(buildNumber) {
  const cfg = await getJenkinsConfig();
  console.log('Fetching Jenkins job:', cfg.jobName);
  console.log('Build number:', buildNumber);
  const url = `${await buildJobPath()}/${buildNumber}/api/json`;
  const client = await getClient();
  const { data } = await client.get(url);
  const run = normalizeBuild(data);
  let logs = await fetchFullLog(buildNumber);
  logs = decodeJenkinsConsole(logs);
  const stages = await fetchStages(buildNumber);
  return {
    lastUpdated: new Date().toISOString(),
    latest: { ...run, stages, consoleUrl: `${cfg.baseUrl}${await buildJobPath()}/${buildNumber}/console` },
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
      // Only schedule analysis for failed builds and when analysis is missing
      if (raw.status === 'FAILURE' && !ai) {
        console.log(`[AI] Scheduling missing analysis for failed build #${raw.buildNumber}`);
        await storeAIAnalysisForRawLog(raw, { io });
      }
    }
  } catch (err) {
    console.error('Failed to schedule missing analyses:', err?.message || err);
  }
}
