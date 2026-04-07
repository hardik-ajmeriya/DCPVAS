import axios from 'axios';
import { API_BASE } from '../config/apiConfig.js';
import { getAuthToken } from './authToken.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function freshParams(params = {}) {
  return {
    ...params,
    _ts: Date.now(),
  };
}

function isTransientApiError(err) {
  const status = err?.response?.status;
  return !status || status === 408 || status === 425 || status === 429 || status >= 500;
}

async function withBackoff(requestFn, options = {}) {
  const {
    retries = 1,
    baseDelayMs = 700,
    maxDelayMs = 2500,
  } = options;

  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await requestFn();
    } catch (err) {
      if (attempt >= retries || !isTransientApiError(err)) {
        throw err;
      }

      const retryAfterHeader = Number(err?.response?.headers?.['retry-after']);
      const retryAfterMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : 0;

      const backoffMs = Math.min(maxDelayMs, baseDelayMs * (2 ** attempt));
      const jitterMs = Math.floor(Math.random() * 250);
      await sleep(Math.max(retryAfterMs, backoffMs + jitterMs));
      attempt += 1;
    }
  }

  throw new Error('Request retry exhausted');
}

// Central Axios instance configured with API_BASE from apiConfig
const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use(async (requestConfig) => {
  const token = await getAuthToken();
  if (!token) return requestConfig;

  const nextConfig = { ...requestConfig };
  nextConfig.headers = {
    ...(requestConfig.headers || {}),
    Authorization: `Bearer ${token}`,
  };
  return nextConfig;
});

export const API_BASE_URL = API_BASE;
export { api };

export async function getJenkinsSettings() {
  const { data } = await api.get('/settings/jenkins');
  // Expected shape: { jenkinsUrl, jobName, username, isConnected, lastVerifiedAt }
  return data || {};
}

export async function getLatestPipeline() {
  try {
    const { data } = await withBackoff(() => api.get('/pipeline/latest', {
      params: freshParams(),
    }), {
      retries: 1,
      baseDelayMs: 600,
    });
    return data; // { success, data }
  } catch (err) {
    if (err?.response?.status === 404) {
      return { success: false, data: null };
    }
    throw err;
  }
}

export async function getLatestPipelineFlow() {
  const { data } = await api.get('/pipeline/latest-flow', {
    params: freshParams(),
  });
  return data; // { buildNumber, stages }
}

export async function getPipelineHistory(limit = 50) {
  const lim = typeof limit === 'string' ? limit : Number(limit) || 50;
  const { data } = await withBackoff(() => api.get(`/pipeline/history`, { params: { limit: lim } }), {
    retries: 1,
    baseDelayMs: 800,
  });
  return data?.runs || [];
}
 
export async function getPipelineLogs(number) {
  const { data } = await api.get(`/pipeline/logs/${number}`);
  return data; // { rawLogs, consoleUrl, executedAt }
}
 
export async function getPipelineStages() {
  const { data } = await api.get('/pipeline/stages');
  return data; // { stages, lastUpdated }
}

// Dashboard metrics
export async function getDashboardMetrics() {
  try {
    const { data } = await withBackoff(() => api.get('/dashboard/metrics'), {
      retries: 1,
      baseDelayMs: 800,
    });
    // Expected shape:
    // { totalPipelines, activeBuilds, failedToday, avgFixTime, aiAccuracy }
    return data || null;
  } catch (_) {
    // On failure, return null to allow UI to render fallback
    return null;
  }
}

// AI Insights overview
export async function getAIInsights() {
  try {
    const { data } = await api.get('/insights');
    return data?.data || null;
  } catch (err) {
    console.error('Failed to load AI insights', err?.message || err);
    return null;
  }
}

export async function getPipelineBuild(number) {
  try {
    const { data } = await withBackoff(() => api.get(`/pipeline/build/${number}`, {
      params: freshParams(),
    }), {
      retries: 1,
      baseDelayMs: 700,
    });
    return data; // normalized run with logs and stages
  } catch (err) {
    const status = err?.response?.status;
    if (status === 404) {
      // Build not persisted yet; treat as not ready without throwing
      return null;
    }
    throw err;
  }
}

export async function getRawLogs(number) {
  const { data } = await api.get(`/pipeline/logs/${number}`);
  return data; // { rawLogs, consoleUrl, executedAt }
}

export async function getExecutions() {
  const { data } = await api.get('/executions');
  return Array.isArray(data) ? data : [];
}

export async function getExecution(id) {
  const { data } = await api.get(`/executions/${id}`);
  return data;
}

// Fetch final analysis for a given build number
export async function getPipelineAnalysis(number) {
  if (!number) throw new Error('build number is required');
  const { data } = await api.get(`/pipeline/analysis/${number}`);
  return data; // expected: full analysis object from MongoDB
}

export async function getAnalysisStatus(jobName, buildNumber) {
  if (!jobName || !buildNumber) throw new Error('jobName and buildNumber are required');
  const { data } = await api.get(`/pipeline/analysis-status/${encodeURIComponent(jobName)}/${buildNumber}`);
  return data?.data || null;
}

<<<<<<< HEAD
export async function getInsights() {
  const { data } = await withBackoff(() => api.get('/insights'), {
    retries: 1,
    baseDelayMs: 700,
  });
  return data || null;
}

export default { getJenkinsSettings, getLatestPipeline, getLatestPipelineFlow, getPipelineHistory, getPipelineLogs, getPipelineStages, getPipelineBuild, getExecutions, getExecution, getRawLogs, getPipelineAnalysis, getDashboardMetrics, getInsights };
=======
export default { getJenkinsSettings, getLatestPipeline, getLatestPipelineFlow, getPipelineHistory, getPipelineLogs, getPipelineStages, getPipelineBuild, getExecutions, getExecution, getRawLogs, getPipelineAnalysis, getDashboardMetrics, getAIInsights };
>>>>>>> 526fa79 (fix: scalaton loading & jenkins config)
