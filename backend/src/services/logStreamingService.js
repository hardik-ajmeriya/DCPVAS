// Jenkins live log streaming service
// Polls consoleText incrementally and emits Socket.IO events without filtering

import axios from 'axios';
import { getJenkinsConfig } from './jenkinsService.js';

let io = null;
export function setSocketIO(socketInstance) {
  io = socketInstance || null;
}

// Active watchers keyed by buildNumber
const watchers = new Map();

function buildJobPathFromName(jobName) {
  const parts = String(jobName || '')
    .split('/')
    .filter(Boolean)
    .map((p) => `/job/${encodeURIComponent(p)}`);
  return parts.join('');
}

async function makeClient() {
  const cfg = await getJenkinsConfig();
  return axios.create({
    baseURL: cfg.baseUrl,
    auth: { username: cfg.auth.username || '', password: cfg.auth.password || '' },
    timeout: 15000,
  });
}

async function fetchConsoleText(client, jobPath, buildNumber) {
  const url = `${jobPath}/${buildNumber}/consoleText`;
  const res = await client.get(url, {
    responseType: 'text',
    transformResponse: [(d) => d],
    headers: { Accept: 'text/plain', 'Accept-Encoding': 'identity' },
  });
  return String(res.data || '');
}

async function fetchBuildStatus(client, jobPath, buildNumber) {
  try {
    const url = `${jobPath}/${buildNumber}/api/json`;
    const { data } = await client.get(url);
    const building = !!data?.building;
    const result = data?.result || null; // SUCCESS / FAILURE / ABORTED / null while building
    return { building, result };
  } catch {
    return { building: true, result: null };
  }
}

// Public API: start watching a specific build number
export async function watchBuildLogs(buildNumber) {
  const n = Number(buildNumber);
  if (!Number.isFinite(n) || n <= 0) throw new Error('Invalid build number');
  if (watchers.has(n)) return watchers.get(n).stop; // already watching

  const cfg = await getJenkinsConfig();
  const jobPath = buildJobPathFromName(cfg.jobName);
  const client = await makeClient();

  let stopped = false;
  let previousLength = 0;
  let pollCount = 0;

  async function pollOnce() {
    if (stopped) return;
    try {
      const text = await fetchConsoleText(client, jobPath, n);
      // Compute new chunk by slice; handle log truncation edge-case
      if (text.length < previousLength) {
        // Jenkins rotated or reset; treat as full replace (emit as new chunk)
        previousLength = 0;
      }
      const chunk = text.slice(previousLength);
      if (chunk && chunk.length > 0) {
        previousLength = text.length;
        try {
          io?.emit('logs:append', { buildNumber: n, newLogsChunk: chunk });
        } catch {}
      }

      // Check build status every 2 polls to reduce API load
      pollCount += 1;
      if (pollCount % 2 === 0) {
        const { building, result } = await fetchBuildStatus(client, jobPath, n);
        if (!building && result) {
          // Final completion event; consumers can update final state from REST if needed
          try {
            io?.emit('logs:complete', { buildNumber: n, result });
          } catch {}
          stop();
        }
      }
    } catch (e) {
      // Swallow transient network errors; retry on next tick
      // If persistent errors, allow watcher to continue for a while.
    }
  }

  const intervalId = setInterval(pollOnce, 2000); // 2 seconds cadence
  // Fire immediately to avoid initial delay
  pollOnce();

  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(intervalId);
    watchers.delete(n);
  }

  watchers.set(n, { stop });
  return stop;
}

export function isWatching(buildNumber) {
  return watchers.has(Number(buildNumber));
}
