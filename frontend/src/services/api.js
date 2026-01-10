import axios from 'axios';

// Default to backend dev port 4000; override via VITE_API_BASE_URL if needed
const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const api = axios.create({
  baseURL: apiBase,
});

export async function getLatestPipeline() {
  const { data } = await api.get('/pipeline/latest');
  return data;
}

export async function getPipelineHistory(limit = 50) {
  const lim = typeof limit === 'string' ? limit : Number(limit) || 50;
  const { data } = await api.get(`/pipeline/history`, { params: { limit: lim } });
  return data?.runs || [];
}
 
export async function getPipelineLogs() {
  const { data } = await api.get('/pipeline/logs');
  return data; // { logs, lastLines, lastUpdated }
}
 
export async function getPipelineStages() {
  const { data } = await api.get('/pipeline/stages');
  return data; // { stages, lastUpdated }
}

export async function getPipelineBuild(number) {
  const { data } = await api.get(`/pipeline/build/${number}`);
  return data; // normalized run with logs and stages
}

export async function getExecutions() {
  const { data } = await api.get('/executions');
  return Array.isArray(data) ? data : [];
}

export async function getExecution(id) {
  const { data } = await api.get(`/executions/${id}`);
  return data;
}

export default { getLatestPipeline, getPipelineHistory, getPipelineLogs, getPipelineStages, getPipelineBuild, getExecutions, getExecution };
