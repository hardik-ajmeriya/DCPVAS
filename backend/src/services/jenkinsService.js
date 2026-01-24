// Live Jenkins integration using Jenkins Remote API with polling
// SECURITY: Credentials are stored only in backend environment variables.
// Jenkins runs pipelines; this service only reads data for monitoring/analysis.

import axios from 'axios';
import { cleanJenkinsLogs } from './logSanitizer.js';
import { decodeJenkinsConsole } from './logDecoder.js';
import PipelineRawLog from '../models/PipelineRawLog.js';
import PipelineAIAnalysis from '../models/PipelineAIAnalysis.js';
import PipelineAnalysisAudit from '../models/PipelineAnalysisAudit.js';
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
// Track last known build number to emit build:new on increments
let lastKnownBuildNumber = null;

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
    // If build number increased, emit build:new for frontend hard reset
    if (
      typeof lastKnownBuildNumber === 'number' &&
      normalized.buildNumber > lastKnownBuildNumber
    ) {
      try {
        const cfg = await getJenkinsConfig();
        io?.emit('build:new', {
          jobName: cfg.jobName || 'unknown-job',
          buildNumber: normalized.buildNumber,
          status: 'BUILDING',
        });
      } catch {}
    }
  }
  // Build state guard & DB source of truth
  const client = await getClient();
  const jobPath = await buildJobPath();
  const buildNumber = normalized?.buildNumber;
  let logs = cache.logs;
  let stages = cache.stages;
  if (buildNumber != null) {
    try {
      const statusResp = await client.get(`${jobPath}/${buildNumber}/api/json`);
      const building = !!statusResp?.data?.building;
      const result = statusResp?.data?.result || null; // SUCCESS/FAILURE/ABORTED/null
      const jobName = cfg.jobName || 'unknown-job';
      const rawExisting = await PipelineRawLog.findOne({ jobName, buildNumber }).lean();

      if (building) {
        // Emit started only once per build
        if (!rawExisting) {
          try {
            io?.emit('build:new', { jobName: cfg.jobName || 'unknown-job', buildNumber, buildStatus: 'BUILDING' });
            io?.emit('build:started', { buildNumber });
          } catch {}
        }
        // Fetch incremental consoleText and append
        const currentLogs = await fetchFullLog(buildNumber);
        const currentSize = (currentLogs || '').length;
        const lastSize = rawExisting?.lastLogSize || 0;
        const newChunk = currentSize > lastSize ? (currentLogs || '').slice(lastSize) : '';
        // Emit live update for streaming UI
        if (newChunk) {
          try { io?.emit('build:log_update', { buildNumber, newLogsChunk: newChunk }); } catch {}
        }
        await PipelineRawLog.findOneAndUpdate(
          { jobName, buildNumber },
          {
            $setOnInsert: {
              consoleUrl: `${cfg.baseUrl}${jobPath}/${buildNumber}/console`,
              executedAt: new Date(),
              status: null,
            },
            $set: {
              buildStatus: 'BUILDING',
              building: true,
              logsFinal: false,
              analysisStatus: 'WAITING_FOR_BUILD',
              rawLogs: currentLogs || rawExisting?.rawLogs || '',
              lastLogSize: currentSize,
            },
          },
          { upsert: true, new: true }
        );
      } else if (!building && result) {
        // Completed → fetch logs and stages, persist; then wait for stabilization
        const finalLogs = await fetchFullLog(buildNumber);
        stages = await fetchStages(buildNumber);
        logs = finalLogs;
        const statusNorm = result === 'SUCCESS' ? 'SUCCESS' : result === 'FAILURE' ? 'FAILURE' : 'ABORTED';
        const prev = await PipelineRawLog.findOne({ jobName, buildNumber }).lean();
        const currentSize = (logs || '').length;
        const stabilized = prev && prev.lastLogSize === currentSize;
        const doc = await PipelineRawLog.findOneAndUpdate(
          { jobName, buildNumber },
          {
            $setOnInsert: {
              executedAt: new Date(),
              consoleUrl: `${cfg.baseUrl}${jobPath}/${buildNumber}/console`,
            },
            $set: {
              status: statusNorm,
              buildStatus: 'COMPLETED',
              building: false,
              stages,
              rawLogs: logs || '',
              lastLogSize: currentSize,
              logsFinal: !!stabilized,
              analysisStatus: statusNorm === 'SUCCESS' ? 'NOT_REQUIRED' : (stabilized ? 'WAITING_FOR_LOGS' : 'WAITING_FOR_LOGS'),
            },
          },
          { upsert: true, new: true }
        );
        // Emit completion event and final logs for reconciliation
        try {
          io?.emit('build:completed', { buildNumber, result: statusNorm });
          io?.emit('logs:complete', { buildNumber, logs: logs || '', status: statusNorm });
        } catch {}
        // SUCCESS builds → mark NOT_REQUIRED and skip AI
        if (statusNorm !== 'FAILURE') {
          try {
            io?.emit('analysis:skipped', { buildNumber, reason: 'NOT_REQUIRED' });
            await PipelineAnalysisAudit.findOneAndUpdate(
              { jobName, buildNumber },
              { $setOnInsert: { analyzedAt: new Date() }, $set: { analysisStatus: 'SKIPPED' } },
              { upsert: true, new: true }
            );
          } catch {}
        }
        // FAILURE builds → schedule AI only when stabilization true and no existing completed analysis for same result
        if (statusNorm === 'FAILURE') {
          try {
            const existingAI = await PipelineAIAnalysis.findOne({ jobName, buildNumber, finalResult: 'FAILURE', analysisStatus: 'COMPLETED' }).lean();
            if (!stabilized) {
              console.log(`[AI] Waiting for logs to stabilize (#${buildNumber}) size=${currentSize}`);
            } else if (existingAI) {
              io?.emit('analysis:skipped', { buildNumber, reason: 'ALREADY_ANALYZED' });
              await PipelineRawLog.updateOne({ jobName, buildNumber }, { $set: { analysisStatus: 'COMPLETED' } });
            } else if (doc.logsFinal === true) {
              const hasFinishedLine = /Finished:\s*(SUCCESS|FAILURE|ABORTED)/i.test(logs || '');
              if (!hasFinishedLine) {
                console.log(`[AI] Waiting for final 'Finished:' line (#${buildNumber})`);
              } else {
              // Atomically transition to AI_ANALYZING; block duplicates
              const res = await PipelineRawLog.updateOne(
                { jobName, buildNumber, analysisStatus: { $in: ['WAITING_FOR_LOGS', 'WAITING_FOR_BUILD'] } },
                { $set: { analysisStatus: 'AI_ANALYZING' } }
              );
              if (res.modifiedCount === 1) {
                console.log(`[ANALYSIS] scheduling started (#${buildNumber})`);
                io?.emit('analysis:started', { buildNumber });
                await storeAIAnalysisForRawLog(doc, { io });
              } else {
                console.log(`[ANALYSIS] blocked: conflict prevented (#${buildNumber})`);
              }
              }
            }
          } catch (err) {
            console.error('AI analysis scheduling failed:', err?.message || err);
          }
        }
      }
    } catch (e) {
      // resilient
    }
  }
  cache = {
    lastUpdated: new Date().toISOString(),
    buildNumber: normalized?.buildNumber ?? cache.buildNumber,
    latest: { ...normalized, stages },
    logs,
    stages,
  };
  if (normalized?.buildNumber != null) lastKnownBuildNumber = normalized.buildNumber;
  return cache;
}

let pollerStarted = false;
async function startPoller(intervalMs = 2500) {
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

export function initJenkinsPolling(intervalMs = 2500) {
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
      const aiCompleted = await PipelineAIAnalysis.findOne({ jobName: raw.jobName, buildNumber: raw.buildNumber, finalResult: 'FAILURE', analysisStatus: 'COMPLETED' }).lean();
      const aiRunning = await PipelineAIAnalysis.findOne({ jobName: raw.jobName, buildNumber: raw.buildNumber, finalResult: 'FAILURE', analysisStatus: 'AI_ANALYZING' }).lean();
      // Startup safety: do NOT schedule new analyses. Only resume if raw indicates AI_ANALYZING and there is no completed analysis.
      if (raw.analysisStatus === 'AI_ANALYZING' && raw.buildStatus === 'COMPLETED' && raw.logsFinal === true && !aiCompleted) {
        console.log(`[ANALYSIS] resuming in-progress analysis for failed build #${raw.buildNumber}`);
        io?.emit('analysis:started', { buildNumber: raw.buildNumber });
        await storeAIAnalysisForRawLog(await PipelineRawLog.findById(raw._id), { io });
      } else if (aiRunning) {
        // Keep running; no action
      }
    }
  } catch (err) {
    console.error('Failed to schedule missing analyses:', err?.message || err);
  }
}
