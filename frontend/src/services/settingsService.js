import axios from 'axios';
import { API_BASE } from '../config/apiConfig.js';

// Base API client; URL sourced from central API_BASE config
const api = axios.create({ baseURL: API_BASE });

export async function getJenkinsSettings() {
  const { data } = await api.get('/settings/jenkins');
  return data || {};
}

export async function saveJenkinsSettings({ jenkinsUrl, jobName, username, apiToken }) {
  const payload = { jenkinsUrl, jobName, username, apiToken };
  const { data } = await api.post('/settings/jenkins/save', payload);
  return data;
}

export async function testJenkinsConnection(payload) {
  // Payload can be omitted; backend will fallback to DB
  const { data } = await api.post('/settings/jenkins/test', payload || {});
  return data;
}

export default { getJenkinsSettings, saveJenkinsSettings, testJenkinsConnection };
