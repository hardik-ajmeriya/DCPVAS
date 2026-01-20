import { isLiveEnabled } from "../services/jenkinsService.js";
import {
  getLatestWithAnalysis,
  getHistory,
  getBuildWithAnalysis,
  getRawLogs,
  getFailuresTimeline,
  reanalyzeBuild,
} from "../services/pipelineDataService.js";
import { analyzeCleanedLogsStrict } from "../services/openaiService.js";

export async function getLatestPipeline(req, res) {
  try {
    const combined = await getLatestWithAnalysis();
    if (!combined) return res.status(404).json({ error: "No builds found" });
    const { raw, ai } = combined;
    const ready = !!ai && ai.analysisStatus === 'READY';
    return res.json({
      jobName: raw.jobName,
      buildNumber: raw.buildNumber,
      status: raw.status,
      failedStage: ready ? (ai.failedStage ?? null) : null,
      humanSummary: ready ? (ai.humanSummary ?? null) : null,
      suggestedFix: ready ? (ai.suggestedFix ?? null) : null,
      technicalRecommendation: ready ? (ai.technicalRecommendation ?? null) : null,
      confidenceScore: ready && typeof ai.confidenceScore === 'number' ? ai.confidenceScore : null,
      analysisStatus: ai?.analysisStatus || 'ANALYSIS_IN_PROGRESS',
      analysisStep: ai?.analysisStep || 'FETCHING_LOGS',
    });
  } catch (e) {
    console.error("Failed to fetch latest:", e?.message || e);
    return res.status(502).json({ error: "Failed to fetch latest build" });
  }
}

export async function getPipelineHistory(req, res) {
  try {
    const { limit } = req.query;
    const lim = typeof limit === "string" && limit.toLowerCase() === "all" ? "all" : Number(limit) || 50;
    const runs = await getHistory(lim);
    return res.json({ runs });
  } catch (e) {
    console.error("Failed to fetch history:", e?.message || e);
    return res.status(502).json({ error: "Failed to fetch history" });
  }
}

export async function getPipelineLogs(req, res) {
  try {
    const { number } = req.params;
    if (!number || Number.isNaN(Number(number))) {
      return res.status(400).json({ error: "Invalid build number" });
    }
    const raw = await getRawLogs(Number(number));
    if (!raw) return res.status(404).json({ error: "Build not found" });
    return res.json(raw);
  } catch (e) {
    console.error("Failed to fetch logs:", e?.message || e);
    return res.status(502).json({ error: "Failed to fetch logs" });
  }
}

export async function getPipelineStages(req, res) {
  try {
    const combined = await getLatestWithAnalysis();
    if (!combined) return res.status(404).json({ error: "No builds found" });
    return res.json({ stages: combined.raw?.stages || [], lastUpdated: combined.raw?.executedAt });
  } catch (e) {
    console.error("Failed to fetch stages:", e?.message || e);
    return res.status(502).json({ error: "Failed to fetch stages" });
  }
}

export async function getPipelineBuild(req, res) {
  const { number } = req.params;
  if (!number || Number.isNaN(Number(number))) {
    return res.status(400).json({ error: "Invalid build number" });
  }
  try {
    const combined = await getBuildWithAnalysis(Number(number));
    if (!combined) return res.status(404).json({ error: "Build not found" });
    const { raw, ai } = combined;
    return res.json({
      jobName: raw.jobName,
      buildNumber: raw.buildNumber,
      status: raw.status,
      stages: raw.stages,
      executedAt: raw.executedAt,
      consoleUrl: raw.consoleUrl,
      analysis: ai || null,
    });
  } catch (e) {
    return res.status(502).json({ error: "Failed to fetch build" });
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
    const lim = typeof limit === "string" && limit.toLowerCase() === "all" ? "all" : Number(limit) || 25;
    const timeline = await getFailuresTimeline(lim);
    return res.json({ timeline });
  } catch (e) {
    console.error("Failed to compute failure timeline:", e?.message || e);
    return res.status(502).json({ error: "Failed to compute failure timeline" });
  }
}

// Sample controller function: analyze Jenkins logs via OpenAI (backend-only)
export async function analyzeJenkinsLogs(req, res) {
  try {
    const logs = String(req.body?.logs || "");
    if (!logs) return res.status(400).json({ error: "Missing logs" });
    const json = await analyzeCleanedLogsStrict(logs);
    return res.json(json);
  } catch (e) {
    console.error("OpenAI analysis failed:", e?.message || e);
    return res.status(502).json({ error: "Failed to analyze logs" });
  }
}

export async function reanalyzePipelineBuild(req, res) {
  const { number } = req.params;
  if (!number || Number.isNaN(Number(number))) {
    return res.status(400).json({ error: "Invalid build number" });
  }
  try {
    const analysis = await reanalyzeBuild(Number(number));
    if (!analysis) return res.status(404).json({ error: "Build not found" });
    return res.json(analysis);
  } catch (e) {
    if (e?.status === 429) {
      return res.status(429).json({ error: "AI quota exceeded", retryAfter: "later" });
    }
    return res.status(502).json({ error: "Failed to re-run analysis" });
  }
}
