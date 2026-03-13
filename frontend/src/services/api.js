import axios from 'axios';

// Default to backend dev port 4000; override via VITE_API_BASE_URL if needed
// IMPORTANT: Backend mounts routes under '/api' (see backend/src/app.js)
const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const api = axios.create({
  baseURL: apiBase,
});

export const API_BASE_URL = apiBase;

export async function getJenkinsSettings() {
  const { data } = await api.get('/settings/jenkins');
  // Expected shape: { jenkinsUrl, jobName, username, isConnected, lastVerifiedAt }
  return data || {
    
  };
}

export async function getLatestPipeline() {
  const { data } = await api.get('/pipeline/latest');
  return data; // { jobName, buildNumber, status, stages, executedAt, consoleUrl, analysis }
}

export async function getLatestPipelineFlow() {
  const { data } = await api.get('/pipeline/latest-flow');
  return data; // { buildNumber, stages }
}

export async function getPipelineHistory(limit = 50) {
  const lim = typeof limit === 'string' ? limit : Number(limit) || 50;
  const { data } = await api.get(`/pipeline/history`, { params: { limit: lim } });
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
    const { data } = await api.get('/dashboard/metrics');
    // Expected shape:
    // { totalPipelines, activeBuilds, failedToday, avgFixTime, aiAccuracy }
    return data || null;
  } catch (_) {
    // On failure, return null to allow UI to render fallback
    return null;
  }
}

export async function getPipelineBuild(number) {
  try {
    const { data } = await api.get(`/pipeline/build/${number}`);
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

export default { getJenkinsSettings, getLatestPipeline, getLatestPipelineFlow, getPipelineHistory, getPipelineLogs, getPipelineStages, getPipelineBuild, getExecutions, getExecution, getRawLogs, getPipelineAnalysis, getDashboardMetrics };
