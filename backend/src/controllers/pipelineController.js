import { extractTailLines } from '../services/logProcessor.js';
import { cleanJenkinsLogs } from '../services/logSanitizer.js';
import { analyzeJenkinsLog } from '../services/strictAnalyzer.js';
import { getLatestCached, getRecentBuilds, getBuildDetails, isLiveEnabled } from '../services/jenkinsService.js';
import { computeFailureInsights, enrichWithRepeats } from '../services/failureIntelligence.js';
import { analyzeLogsWithOpenAI } from '../services/openaiService.js';

export async function getLatestPipeline(req, res) {
  try {
    console.log('Fetching Jenkins job:', process.env.JENKINS_JOB);
    const { latest, logs } = await getLatestCached();
    if (latest?.buildNumber != null) {
      console.log('Build number:', latest.buildNumber);
    }
    const cleaned = cleanJenkinsLogs(logs);
    let humanSummary = '';
    let suggestedFix = '';
    let technicalRecommendation = '';
    try {
      const ai = await analyzeLogsWithOpenAI({ cleanedLogs: cleaned });
      humanSummary = ai?.humanSummary || '';
      suggestedFix = ai?.suggestedFix || '';
      technicalRecommendation = ai?.technicalRecommendation || '';
    } catch (e) {
      if (e?.status === 429) {
        return res.status(429).json({ error: 'AI quota exceeded', retryAfter: 'later' });
      }
      // Fallback to strict analyzer when AI unavailable
      const fallback = analyzeJenkinsLog(cleaned);
      humanSummary = fallback.humanSummary;
      suggestedFix = fallback.suggestedFix;
      technicalRecommendation = fallback.technicalRecommendation;
    }
    // status from Jenkins if available, else derive
    const status = latest?.status || (cleaned.includes('Finished: FAILURE') ? 'FAILED' : 'SUCCESS');
    return res.json({
      ...latest,
      status,
      humanSummary,
      suggestedFix,
      technicalRecommendation,
      rawLogs: cleaned,
      logs: cleaned, // keep for compatibility with existing consumers
    });
  } catch (e) {
    console.error('Failed to fetch latest Jenkins data:', e?.message || e);
    return res.status(502).json({ error: 'Failed to fetch Jenkins latest data' });
  }
}

export async function getPipelineHistory(req, res) {
  try {
    const { limit } = req.query;
    const lim = typeof limit === 'string' && limit.toLowerCase() === 'all' ? 'all' : Number(limit) || 50;
    const runs = await getRecentBuilds(lim);
    return res.json({ runs });
  } catch (e) {
    console.error('Failed to fetch Jenkins history:', e?.message || e);
    return res.status(502).json({ error: 'Failed to fetch Jenkins history' });
  }
}

export async function getPipelineLogs(req, res) {
  try {
    const { logs, lastUpdated } = await getLatestCached();
    const cleaned = cleanJenkinsLogs(logs);
    const lastLines = extractTailLines(cleaned, 40);
    return res.json({ logs: cleaned, lastLines, lastUpdated });
  } catch (e) {
    console.error('Failed to fetch Jenkins logs:', e?.message || e);
    return res.status(502).json({ error: 'Failed to fetch Jenkins logs' });
  }
}

export async function getPipelineStages(req, res) {
  try {
    const { latest, lastUpdated } = await getLatestCached();
    return res.json({ stages: latest?.stages || [], lastUpdated });
  } catch (e) {
    console.error('Failed to fetch Jenkins stages:', e?.message || e);
    return res.status(502).json({ error: 'Failed to fetch Jenkins stages' });
  }
}

export async function getPipelineBuild(req, res) {
  const { number } = req.params;
  if (!number || Number.isNaN(Number(number))) {
    return res.status(400).json({ error: 'Invalid build number' });
  }
  try {
    const { latest, logs, stages, lastUpdated } = await getBuildDetails(Number(number));
    const cleaned = cleanJenkinsLogs(logs);
    let humanSummary = '';
    let suggestedFix = '';
    let technicalRecommendation = '';
    try {
      const ai = await analyzeLogsWithOpenAI({ cleanedLogs: cleaned });
      humanSummary = ai?.humanSummary || '';
      suggestedFix = ai?.suggestedFix || '';
      technicalRecommendation = ai?.technicalRecommendation || '';
    } catch (e) {
      if (e?.status === 429) {
        return res.status(429).json({ error: 'AI quota exceeded', retryAfter: 'later' });
      }
      const fallback = analyzeJenkinsLog(cleaned);
      humanSummary = fallback.humanSummary;
      suggestedFix = fallback.suggestedFix;
      technicalRecommendation = fallback.technicalRecommendation;
    }
    const status = latest?.status || (cleaned.includes('Finished: FAILURE') ? 'FAILED' : 'SUCCESS');
    return res.json({
      ...latest,
      status,
      humanSummary,
      suggestedFix,
      technicalRecommendation,
      rawLogs: cleaned,
      logs: cleaned,
      stages,
      lastUpdated,
    });
  } catch (e) {
    return res.status(502).json({ error: 'Failed to fetch Jenkins build details' });
  }
}

export function getDiagnostics(req, res) {
  const hasUrl = !!process.env.JENKINS_URL;
  const hasJob = !!process.env.JENKINS_JOB;
  const hasUser = !!process.env.JENKINS_USER;
  const hasToken = !!process.env.JENKINS_TOKEN;
  res.json({
    hasUrl,
    hasJob,
    hasUser,
    hasToken,
    liveEnabled: isLiveEnabled(),
  });
}

export async function getFailureTimeline(req, res) {
  try {
    const { limit } = req.query;
    const lim = typeof limit === 'string' && limit.toLowerCase() === 'all' ? 'all' : Number(limit) || 25;
    // Use recent builds list to pick failures only
    const builds = await getRecentBuilds(lim);
    const failedBuilds = builds.filter((b) => b.status === 'FAILED' || b.status === 'FAILURE');
    const timeline = [];
    for (const b of failedBuilds) {
      try {
        const details = await getBuildDetails(b.buildNumber);
        const { latest, logs, stages } = details;
        const insights = computeFailureInsights({ logs, stages, run: latest });
        timeline.push({
          jobName: latest?.jobName || b.jobName,
          buildNumber: b.buildNumber,
          status: 'FAILED',
          executedAt: latest?.startedAt ? new Date(latest.startedAt) : undefined,
          insights,
        });
      } catch (err) {
        // Skip broken builds gracefully
      }
    }
    const enriched = enrichWithRepeats(timeline).sort((a, b) => (b.buildNumber || 0) - (a.buildNumber || 0));
    return res.json({ timeline: enriched });
  } catch (e) {
    console.error('Failed to compute failure timeline:', e?.message || e);
    return res.status(502).json({ error: 'Failed to compute failure timeline' });
  }
}

// Sample controller function: analyze Jenkins logs via OpenAI (backend-only)
export async function analyzeJenkinsLogs(req, res) {
  try {
    // Prefer explicit logs from body; fallback to latest Jenkins logs
    let logs = String(req.body?.logs || '');
    if (!logs) {
      const { logs: latestLogs } = await getLatestCached();
      logs = latestLogs || '';
    }
    const cleaned = cleanJenkinsLogs(logs);
    const json = await analyzeLogsWithOpenAI({ cleanedLogs: cleaned });
    return res.json(json);
  } catch (e) {
    console.error('OpenAI analysis failed:', e?.message || e);
    return res.status(502).json({ error: 'Failed to analyze logs' });
  }
}
