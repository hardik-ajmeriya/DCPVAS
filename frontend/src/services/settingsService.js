import axios from 'axios';

// Base API client; URL sourced from Vite env, no hardcoding
const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const api = axios.create({ baseURL: apiBase });

export async function getJenkinsSettings() {
  const { data } = await api.get('/settings/jenkins');
  return data || {};
}

export async function saveJenkinsSettings({ jenkinsUrl, jobName, username, apiToken }) {
  const payload = { jenkinsUrl, jobName, username, apiToken };
  const { data } = await api.post('/settings/jenkins', payload);
  return data;
}

export async function testJenkinsConnection(payload) {
  // Payload can be omitted; backend will fallback to DB
  const { data } = await api.post('/settings/jenkins/test', payload || {});
  return data;
}

export default { getJenkinsSettings, saveJenkinsSettings, testJenkinsConnection };
