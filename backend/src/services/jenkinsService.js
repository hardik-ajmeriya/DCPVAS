// Live Jenkins integration using Jenkins Remote API with polling
// SECURITY: Credentials are stored only in backend environment variables.
// Jenkins runs pipelines; this service only reads data for monitoring/analysis.

import axios from 'axios';
import { cleanJenkinsLogs } from './logSanitizer.js';
import PipelineRun from '../models/PipelineRun.js';
import { analyzeJenkinsLog } from './strictAnalyzer.js';

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
  let start = 0;
  let complete = false;
  let content = '';
  while (!complete) {
    const url = `${buildJobPath()}/${buildNumber}/logText/progressiveText?start=${start}`;
    const res = await getClient().get(url, { responseType: 'text', transformResponse: [(d) => d] });
    const chunk = res.data || '';
    content += chunk;
    const more = res.headers['x-more-data'] === 'true';
    const size = parseInt(res.headers['x-text-size'] || '0', 10);
    if (!more) {
      complete = true;
    } else {
      start = size;
      if (start > 5_000_000) complete = true;
    }
  }
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
    stages = await fetchStages(normalized.buildNumber);
  }
  cache = {
    lastUpdated: new Date().toISOString(),
    buildNumber: normalized?.buildNumber ?? cache.buildNumber,
    latest: { ...normalized, stages },
    logs,
    stages,
  };

  // Persist completed executions to MongoDB (no overwrite, one per build)
  try {
    if (normalized && normalized.buildNumber != null) {
      const statusNorm = normalized.status === 'FAILED' ? 'FAILURE' : normalized.status === 'SUCCESS' ? 'SUCCESS' : normalized.status;
      // Only save once job is complete (SUCCESS or FAILURE)
      if (statusNorm === 'SUCCESS' || statusNorm === 'FAILURE') {
        const jobName = getEnv().JENKINS_JOB || 'unknown-job';
        const exists = await PipelineRun.findOne({ jobName, buildNumber: normalized.buildNumber }).lean();
        if (!exists) {
          const cleaned = cleanJenkinsLogs(logs);
          const { humanSummary, suggestedFix, technicalRecommendation, failedStage: analyzedFailedStage } = analyzeJenkinsLog(cleaned);
          const stageFailed = Array.isArray(stages) ? (stages.find((s) => s.status === 'FAILED')?.name || null) : null;
          const failedStage = stageFailed || analyzedFailedStage || null;
          await PipelineRun.create({
            jobName,
            buildNumber: normalized.buildNumber,
            status: statusNorm,
            failedStage,
            humanSummary,
            suggestedFix,
            technicalRecommendation,
            rawLogs: cleaned,
            executedAt: new Date(),
          });
          console.log(`Saved execution ${jobName} #${normalized.buildNumber} (${statusNorm})`);
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
  const logs = await fetchFullLog(buildNumber);
  const stages = await fetchStages(buildNumber);
  return {
    lastUpdated: new Date().toISOString(),
    latest: { ...run, stages, consoleUrl: `${getEnv().JENKINS_URL}${buildJobPath()}/${buildNumber}/console` },
    logs,
    stages,
  };
}
