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
import { upsertPipelineRunFromRaw } from './pipelineRunService.js';
import { broadcastEvent } from './eventStreamService.js';
import { getLatestWithAnalysis } from './pipelineDataService.js';

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
// Track last SSE payload to avoid spamming identical updates
let lastBroadcast = { buildNumber: null, status: null };

// Map Jenkins build payload to a consistent human-friendly status
function mapBuildStatus(build) {
  if (build?.building) return 'RUNNING';
  const result = String(build?.result || '').toUpperCase();
  if (result === 'SUCCESS') return 'SUCCESS';
  if (result === 'FAILURE') return 'FAILURE';
  if (result === 'ABORTED') return 'ABORTED';
  return 'UNKNOWN';
}

function normalizeBuild(json) {
  if (!json) return null;
  const status = mapBuildStatus(json);
  return {
    id: `jenkins-${json.number}`,
    buildNumber: json.number,
    status: status === 'SUCCESS' ? 'SUCCESS' : status === 'FAILURE' ? 'FAILED' : status,
    startedAt: json.timestamp ? new Date(json.timestamp).toISOString() : null,
    durationMs: json.duration || 0,
    stages: [], // populated later
  };
}

function extractScmMetadata(buildJson) {
  const actions = Array.isArray(buildJson?.actions) ? buildJson.actions : [];
  for (const action of actions) {
    const branchInfo = action?.lastBuiltRevision?.branch?.[0];
    if (branchInfo) {
      return {
        branch: branchInfo.name || null,
        commit: branchInfo.SHA1 || null,
      };
    }
    if (action?.buildsByBranchName && typeof action.buildsByBranchName === 'object') {
      const firstKey = Object.keys(action.buildsByBranchName)[0];
      const data = action.buildsByBranchName[firstKey];
      if (data?.revision) {
        return {
          branch: data.revision.branch?.[0]?.name || firstKey || null,
          commit: data.revision.SHA1 || null,
        };
      }
    }
  }
  return { branch: null, commit: null };
}

async function buildJobPath(jobNameOverride) {
  const jobName = jobNameOverride || (await getJenkinsConfig()).jobName;
  const parts = (jobName || '').split('/').filter(Boolean);
  return parts.map((p) => `/job/${encodeURIComponent(p)}`).join('');
}

async function fetchLatestBuildJson(jobNameOverride) {
  const url = `${await buildJobPath(jobNameOverride)}/lastBuild/api/json`;
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

// List jobs configured on the Jenkins server root
export async function listJenkinsJobs() {
  const client = await getClient();
  const { data } = await client.get('/api/json?tree=jobs[name]');
  return Array.isArray(data?.jobs) ? data.jobs : [];
}

// Fetch recent builds (raw Jenkins shape) for the configured job
export async function getJenkinsBuilds(limit = 50) {
  const builds = await fetchRecentBuildsJson(limit);
  return Array.isArray(builds) ? builds : [];
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

function normalizeStageStatus(status) {
  const value = String(status || '').trim().toUpperCase();
  if (!value) return 'PENDING';
  if (value === 'SUCCESS') return 'SUCCESS';
  if (value === 'FAILED' || value === 'FAILURE' || value === 'ABORTED' || value === 'UNSTABLE') return 'FAILED';
  if (value === 'IN_PROGRESS' || value === 'PAUSED_PENDING_INPUT' || value === 'PAUSED' || value === 'RUNNING' || value === 'QUEUED') return 'RUNNING';
  if (value === 'NOT_EXECUTED' || value === 'SKIPPED') return 'PENDING';
  return 'PENDING';
}

function normalizeStageStatusForFlow(status) {
  const normalized = normalizeStageStatus(String(status || '').toUpperCase());
  if (normalized === 'SUCCESS') return 'success';
  if (normalized === 'FAILED') return 'failed';
  if (normalized === 'RUNNING') return 'running';
  return 'pending';
}

function isSystemStage(stage) {
  const name = String(stage?.name || '');
  return name.toLowerCase().includes('declarative:');
}

async function fetchStages(buildNumber) {
  try {
    const url = `${await buildJobPath()}/${buildNumber}/wfapi/describe`;
    const client = await getClient();
    const { data } = await client.get(url);
    console.log(`[fetchStages] wfapi raw stages for build #${buildNumber}:`, JSON.stringify(data.stages?.map(s => ({ name: s.name, status: s.status }))));
    const stages = (data.stages || []).map((s) => ({
      name: s.name,
      status: normalizeStageStatus(s.status),
      durationMs: s.durationMillis || 0,
    }));
    if (stages.length) return stages;
  } catch (err) {
    console.warn(`[fetchStages] wfapi failed for build #${buildNumber}:`, err?.message);
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

export async function updateCacheOnce() {
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
      const { branch, commit } = extractScmMetadata(statusResp?.data);
      const durationSeconds = Number.isFinite(statusResp?.data?.duration) ? Math.round(statusResp.data.duration / 1000) : null;
      const jobName = cfg.jobName || 'unknown-job';
      const rawExisting = await PipelineRawLog.findOne({ jobName, buildNumber }).lean();

      if (building) {
        const runningStatus = mapBuildStatus({ building: true });
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
              status: runningStatus,
            },
            $set: {
              status: runningStatus,
              buildStatus: 'BUILDING',
              building: true,
              logsFinal: false,
              analysisStatus: 'WAITING_FOR_BUILD',
              rawLogs: currentLogs || rawExisting?.rawLogs || '',
              lastLogSize: currentSize,
              branch: branch || rawExisting?.branch || null,
              commit: commit || rawExisting?.commit || null,
              durationSeconds: durationSeconds ?? rawExisting?.durationSeconds ?? null,
            },
          },
          { upsert: true, new: true }
        );
      } else if (!building && result) {
        // Completed → fetch logs and stages, persist; then wait for stabilization
        const finalLogs = await fetchFullLog(buildNumber);
        stages = await fetchStages(buildNumber);
        logs = finalLogs;
        const statusNorm = mapBuildStatus({ building: false, result });
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
              branch: branch || prev?.branch || null,
              commit: commit || prev?.commit || null,
              durationSeconds: durationSeconds ?? prev?.durationSeconds ?? null,
            },
          },
          { upsert: true, new: true }
        );
        try {
          await upsertPipelineRunFromRaw(doc);
        } catch (err) {
          console.error('[pipelineRun] failed to upsert from raw log:', err?.message || err);
        }
        // Emit completion event and final logs for reconciliation
        try {
          io?.emit('build:completed', { buildNumber, result: statusNorm });
          io?.emit('logs:complete', { buildNumber, logs: logs || '', status: statusNorm });
        } catch {}
        try {
          broadcastEvent({ type: 'pipeline_update', buildNumber, jobName: jobName, status: statusNorm });
          if (statusNorm === 'SUCCESS') {
            broadcastEvent({ type: 'analysis_completed', buildNumber, jobName, status: 'skipped' });
          }
          lastBroadcast = { buildNumber, status: statusNorm };
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

export async function getPipelineStagesForBuild(buildNumber, { jobName, persist = false } = {}) {
  const numericBuildNumber = Number(buildNumber);
  if (!Number.isFinite(numericBuildNumber) || numericBuildNumber <= 0) return [];

  const stages = await fetchStages(numericBuildNumber);

  if (persist && Array.isArray(stages) && stages.length > 0 && jobName) {
    await PipelineRawLog.updateOne(
      { jobName, buildNumber: numericBuildNumber },
      { $set: { stages } }
    );
  }

  return stages;
}

export async function getLatestPipelineStages(jobNameOverride) {
  const latestBuild = await fetchLatestBuildJson(jobNameOverride);
  const buildNumber = Number(latestBuild?.number);
  const startedAt = typeof latestBuild?.timestamp === 'number' ? new Date(latestBuild.timestamp).toISOString() : null;
  const building = !!latestBuild?.building;
  const durationMs = building && typeof latestBuild?.timestamp === 'number'
    ? Date.now() - latestBuild.timestamp
    : (typeof latestBuild?.duration === 'number' ? latestBuild.duration : null);
  const buildResult = typeof latestBuild?.result === 'string' ? latestBuild.result : undefined;
  const overallStatus = building ? 'running' : normalizeStageStatusForFlow(buildResult);

  if (!Number.isFinite(buildNumber) || buildNumber <= 0) {
    throw new Error('Latest Jenkins build number not found');
  }

  const client = await getClient();
  const jobPath = await buildJobPath(jobNameOverride);
  let rawStages = [];

  try {
    const { data } = await client.get(`${jobPath}/${buildNumber}/wfapi/describe`);
    rawStages = Array.isArray(data?.stages) ? data.stages : [];
    console.log(`[getLatestPipelineStages] wfapi stages for build #${buildNumber}:`, rawStages.map((s) => ({ name: s?.name, status: s?.status || s?.state || s?.result })));
  } catch (err) {
    console.warn(`[getLatestPipelineStages] wfapi failed for build #${buildNumber}:`, err?.message || err);
  }

  const fallbackStages = rawStages.length ? [] : await fetchStages(buildNumber);
  const sourceStages = rawStages.length ? rawStages : fallbackStages;
  const filtered = sourceStages.filter((stage) => !isSystemStage(stage));

  // Cascade pending after first failed stage
  let failureSeen = false;
  const stages = filtered.map((stage) => {
    const normalized = normalizeStageStatusForFlow(stage?.status || stage?.state);
    if (failureSeen) {
      return { name: stage?.name || 'Unnamed Stage', status: 'pending' };
    }
    if (normalized === 'failed') {
      failureSeen = true;
    }
    return { name: stage?.name || 'Unnamed Stage', status: normalized };
  });

  console.log('Jenkins stage response:', stages);
  console.log(`[getLatestPipelineStages] normalized stages for build #${buildNumber}:`, stages);

  return {
    buildNumber,
    stages,
    status: overallStatus,
    building,
    durationMs,
    startedAt,
  };
}

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

// Fetch latest build from Jenkins (via updateCacheOnce), ensure it is synced into Mongo,
// then derive a normalized flow object purely from Mongo-backed state.
export async function getLatestPipelineFlowWithSync() {
  await updateCacheOnce();

  const combined = await getLatestWithAnalysis();
  if (!combined) {
    return {
      jobName: null,
      buildNumber: null,
      status: 'pending',
      building: false,
      durationMs: null,
      startedAt: null,
      stages: [],
    };
  }

  const { raw } = combined;
  const buildNumber = raw?.buildNumber ?? null;
  const jobName = raw?.jobName || null;
  const startedAt = raw?.executedAt || raw?.createdAt || null;
  const building = !!raw?.building || raw?.buildStatus === 'BUILDING';
  const durationMs = Number.isFinite(raw?.durationSeconds) ? raw.durationSeconds * 1000 : null;
  const overallStatus = building
    ? 'running'
    : normalizeStageStatusForFlow(raw?.status || raw?.buildStatus || 'UNKNOWN');

  const sourceStages = Array.isArray(raw?.stages) ? raw.stages : [];
  const filtered = sourceStages.filter((stage) => !isSystemStage(stage));

  let failureSeen = false;
  const stages = filtered.map((stage) => {
    const normalized = normalizeStageStatusForFlow(stage?.status);
    if (failureSeen) {
      return { name: stage?.name || 'Unnamed Stage', status: 'pending' };
    }
    if (normalized === 'failed') {
      failureSeen = true;
    }
    return { name: stage?.name || 'Unnamed Stage', status: normalized };
  });

  return {
    jobName,
    buildNumber,
    status: overallStatus,
    building,
    durationMs,
    startedAt,
    stages,
  };
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
