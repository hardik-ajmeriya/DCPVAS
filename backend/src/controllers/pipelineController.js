import { getLatestPipelineStages, getPipelineStagesForBuild, isLiveEnabled, getLatestPipelineFlowWithSync } from "../services/jenkinsService.js";
import {
  getLatestWithAnalysis,
  getHistory,
  getBuildWithAnalysis,
  getRawLogs,
  getFailuresTimeline,
  getLatestFailures,
  reanalyzeBuild,
} from "../services/pipelineDataService.js";
import { analyzeCleanedLogsStrict } from "../services/openaiService.js";
import { cleanJenkinsLogs } from "../services/logSanitizer.js";
import { decodeJenkinsConsole } from "../services/logDecoder.js";
import PipelineAIAnalysis from "../models/PipelineAIAnalysis.js";
const ANALYSIS_STAGE = {
  FETCH_LOGS: 1,
  FILTER_ERRORS: 2,
  AI_ANALYSIS: 3,
  STORE_RESULTS: 4,
  COMPLETED: 5,
  SKIPPED: 6,
};

export async function getLatestPipeline(req, res) {
  try {
    console.log("Fetching latest pipeline run from Mongo (PipelineRawLog + AI)");
    const combined = await getLatestWithAnalysis();

    if (!combined) {
      return res.json({
        success: true,
        data: null,
        message: "No pipeline executions yet",
      });
    }

    const { raw, ai } = combined;
    const building = !!raw?.building || raw?.buildStatus === 'BUILDING';
    const status = raw?.status || (building ? 'RUNNING' : 'UNKNOWN');

    const base = {
      jobName: raw?.jobName || null,
      buildNumber: raw?.buildNumber ?? null,
      status,
      buildStatus: raw?.buildStatus || (building ? 'BUILDING' : 'COMPLETED'),
      building,
      stages: Array.isArray(raw?.stages) ? raw.stages : [],
      executedAt: raw?.executedAt || raw?.createdAt || null,
      logsFinal: !!raw?.logsFinal,
      analysisStatus: raw?.analysisStatus || ai?.analysisStatus || null,
      progress: (ai?.stage || ai?.analysisStep || raw?.analysisStatus || '').toLowerCase() || null,
      consoleUrl: raw?.consoleUrl || null,
      branch: raw?.branch || null,
      commit: raw?.commit || null,
      durationSeconds: Number.isFinite(raw?.durationSeconds) ? raw.durationSeconds : null,
    };

    const ready = !!ai && (ai.analysisStatus === 'COMPLETED' || ai.analysisRunStatus === 'COMPLETED');
    const withAi = ready
      ? {
          ...base,
          failedStage: ai.failedStage ?? null,
          detectedError: ai.detectedError ?? null,
          humanSummary: ai.humanSummary ?? null,
          suggestedFix: ai.suggestedFix ?? null,
          technicalRecommendation: ai.technicalRecommendation ?? null,
          confidenceScore: typeof ai.confidenceScore === 'number' ? ai.confidenceScore : null,
          finalResult: ai.finalResult ?? null,
        }
      : base;

    return res.json({ success: true, data: withAi });
  } catch (e) {
    console.error("Failed to fetch latest pipeline:", e?.message || e);
    return res.status(500).json({
      success: false,
      message: "Pipeline retrieval failed",
      data: null,
    });
  }
}

export async function getAnalysisStatusForJob(req, res) {
  try {
    const jobName = req.params?.jobName;
    const buildNumber = Number(req.params?.buildNumber);
    if (!jobName || !Number.isFinite(buildNumber)) {
      return res.status(400).json({ success: false, message: "Invalid jobName or buildNumber" });
    }

    const doc = await PipelineAIAnalysis.findOne({ jobName, buildNumber }).sort({ updatedAt: -1 }).lean();
    const currentStage = String(doc?.stage || doc?.analysisStatus || 'FETCH_LOGS').toUpperCase();
    const stageKey = ANALYSIS_STAGE[currentStage] ? currentStage : 'FETCH_LOGS';
    const normalizedStage = stageKey.toLowerCase();
    const runningStep = normalizedStage;
    const completedSteps = Object.entries(ANALYSIS_STAGE)
      .filter(([, idx]) => idx < ANALYSIS_STAGE[stageKey])
      .map(([key]) => key.toLowerCase());
    const skipped = stageKey === 'SKIPPED' || String(doc?.analysisStatus || '').toUpperCase() === 'SKIPPED';

    return res.json({
      success: true,
      data: {
        jobName,
        buildNumber,
        stage: normalizedStage,
        status: doc?.analysisStatus?.toLowerCase?.() || 'pending',
        completedSteps,
        runningStep,
        skipped,
      },
    });
  } catch (e) {
    console.error("Failed to fetch analysis status:", e?.message || e);
    return res.status(500).json({ success: false, message: "Pipeline retrieval failed" });
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
    let stages = Array.isArray(combined.raw?.stages) ? combined.raw.stages : [];

    if (!stages.length && combined.raw?.buildNumber) {
      try {
        stages = await getPipelineStagesForBuild(combined.raw.buildNumber, {
          jobName: combined.raw.jobName,
          persist: true,
        });
      } catch (err) {
        console.warn(`[getPipelineStages] stage recovery failed for build #${combined.raw.buildNumber}:`, err?.message || err);
      }
    }

    return res.json({ stages, lastUpdated: combined.raw?.executedAt, buildNumber: combined.raw?.buildNumber ?? null });
  } catch (e) {
    console.error("Failed to fetch stages:", e?.message || e);
    return res.status(502).json({ error: "Failed to fetch stages" });
  }
}

export async function getLatestPipelineFlow(req, res) {
  try {
    // Fetch latest build from Jenkins, persist it into Mongo, trigger AI if needed,
    // and return a normalized flow object for the frontend.
    const flow = await getLatestPipelineFlowWithSync();
    console.log('[getLatestPipelineFlow] response:', flow);
    return res.json(flow);
  } catch (e) {
    console.error('Failed to fetch latest pipeline flow:', e?.message || e);
    return res.status(502).json({ error: 'Failed to fetch latest pipeline flow' });
  }
}

export async function streamPipelineStages(req, res) {
  // Server-Sent Events stream for live pipeline stage updates
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let active = true;
  const intervalMs = 3000;
  let poller = null;

  const pushEvent = async () => {
    try {
      const flow = await getLatestPipelineStages();
      res.write(`data: ${JSON.stringify(flow)}\n\n`);

      const completed = !flow.building && flow.status !== 'running';
      if (completed) {
        clearInterval(poller);
        active = false;
        res.end();
      }
    } catch (err) {
      console.error('[streamPipelineStages] failed to push update:', err?.message || err);
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Failed to fetch pipeline stages' })}\n\n`);
    }
  };

  // Kick off immediately, then poll
  pushEvent();
  poller = setInterval(pushEvent, intervalMs);

  req.on('close', () => {
    if (!active) return;
    active = false;
    clearInterval(poller);
    res.end();
  });
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
    const isSuccess = raw.status === 'SUCCESS';
    const cleaned = decodeJenkinsConsole(raw.rawLogs || '');
    const isCompilationFailure = raw.status === 'FAILURE' && (!raw.stages || raw.stages.length === 0) && (!cleaned || cleaned.trim().length === 0);
    const placeholder = 'No runtime logs available. The pipeline failed during Jenkinsfile parsing before execution started.';
    const base = {
      jobName: raw.jobName,
      buildNumber: raw.buildNumber,
      status: raw.status,
      buildStatus: raw.buildStatus,
      building: raw.building,
      logsFinal: !!raw.logsFinal,
      stages: raw.stages,
      executedAt: raw.executedAt,
      consoleUrl: raw.consoleUrl,
      finalResult: ai?.finalResult ?? (isSuccess ? 'SUCCESS' : null),
      // Provide logs; if none and compilation failed pre-execution, return placeholder
      logs: isCompilationFailure ? placeholder : (raw.rawLogs || ''),
    };
    if (isSuccess) {
      console.log('STATUS', raw.status);
      console.log('LOG LENGTH BEFORE RESPONSE (build, SUCCESS):', base.logs?.length);
      return res.json({
        ...base,
        analysisStatus: 'NOT_REQUIRED',
        aiAnalysis: { skipped: true, reason: 'NO_FAILURE_DETECTED' },
      });
    }
    // Failure build → include AI outputs when available
    const ready = !!ai && (ai.analysisStatus === 'COMPLETED' || ai.analysisStep === 'READY');
    console.log('STATUS', raw.status);
    console.log('RAW_LOG_LENGTH', base.logs?.length);
    return res.json({
      ...base,
      humanSummary: ready ? (ai?.humanSummary ?? null) : null,
      suggestedFix: ready ? (ai?.suggestedFix ?? null) : null,
      technicalRecommendation: ready ? (ai?.technicalRecommendation ?? null) : null,
      failedStage: ready ? (ai?.failedStage ?? null) : null,
      detectedError: ready ? (ai?.detectedError ?? null) : null,
      confidenceScore: ready && typeof ai?.confidenceScore === 'number' ? ai.confidenceScore : raw?.confidenceScore ?? null,
      analysisStatus: raw?.analysisStatus || (ai?.analysisStatus === 'COMPLETED' ? 'COMPLETED' : (raw.buildStatus === 'COMPLETED' ? 'WAITING_FOR_LOGS' : 'WAITING_FOR_BUILD')),
      finalResult: ai?.finalResult ?? null,
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
    const lim = Number(limit) || 5;
    const failures = await getLatestFailures(lim);
    return res.json({ failures });
  } catch (e) {
    console.error("Failed to fetch latest failures:", e?.message || e);
    return res.status(502).json({ error: "Failed to fetch latest failures", failures: [] });
  }
}

// Sample controller function: analyze Jenkins logs via OpenAI (backend-only)
export async function analyzeJenkinsLogs(req, res) {
  try {
    const io = req.app.get('io');
    const buildNumber = Number(req.body?.buildNumber ?? req.body?.number ?? NaN);
    const logs = String(req.body?.logs || "");
    if (!logs) return res.status(400).json({ error: "Missing logs" });

    // Emit progress: starting logs fetch/prepare (controller-level analysis)
    io?.emit('analysis:progress', {
      buildNumber: Number.isNaN(buildNumber) ? null : buildNumber,
      status: 'ANALYSIS_IN_PROGRESS',
      stage: 'FETCHING_LOGS',
      message: 'Preparing logs for analysis',
    });

    // Clean logs and emit filtering stage
    const cleaned = cleanJenkinsLogs(logs);
    io?.emit('analysis:progress', {
      buildNumber: Number.isNaN(buildNumber) ? null : buildNumber,
      status: 'ANALYSIS_IN_PROGRESS',
      stage: 'FILTERING_ERRORS',
      message: 'Cleaning logs and filtering noisy entries',
    });

    // Before AI call
    io?.emit('analysis:progress', {
      buildNumber: Number.isNaN(buildNumber) ? null : buildNumber,
      status: 'ANALYSIS_IN_PROGRESS',
      stage: 'AI_ANALYZING',
      message: 'Submitting cleaned logs to AI',
    });

    const json = await analyzeCleanedLogsStrict(cleaned);

    // Before storing (this controller does not persist; emit stage for UI completeness)
    io?.emit('analysis:progress', {
      buildNumber: Number.isNaN(buildNumber) ? null : buildNumber,
      status: 'ANALYSIS_IN_PROGRESS',
      stage: 'STORING_RESULTS',
      message: 'Preparing final analysis result',
    });

    // Final completion event
    io?.emit('analysis:complete', {
      buildNumber: Number.isNaN(buildNumber) ? null : buildNumber,
      status: 'READY',
      humanSummary: json?.humanSummary ?? null,
      suggestedFix: json?.suggestedFix ?? null,
      technicalRecommendation: json?.technicalRecommendation ?? null,
      confidenceScore: typeof json?.confidenceScore === 'number' ? json.confidenceScore : null,
    });

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
    // Emit real-time progress via Socket.IO during analysis
    const io = req.app.get('io');
    const combined = await getBuildWithAnalysis(Number(number));
    if (!combined) return res.status(404).json({ error: "Build not found" });
    if (combined.raw.status !== 'FAILURE') {
      return res.json({
        buildNumber: combined.raw.buildNumber,
        aiAnalysis: { skipped: true, reason: 'NO_FAILURE_DETECTED' },
      });
    }
    const analysis = await reanalyzeBuild(Number(number), { io });
    return res.json(analysis);
  } catch (e) {
    if (e?.status === 429) {
      return res.status(429).json({ error: "AI quota exceeded", retryAfter: "later" });
    }
    return res.status(502).json({ error: "Failed to re-run analysis" });
  }
}

// Fetch final analysis document for a build number
export async function getAnalysisStatus(req, res) {
  const { number } = req.params;
  if (!number || Number.isNaN(Number(number))) {
    return res.status(400).json({ error: "Invalid build number" });
  }
  try {
    const combined = await getBuildWithAnalysis(Number(number));
    if (!combined) return res.status(404).json({ error: "Build not found" });
    const { ai } = combined;
    if (!ai) return res.status(404).json({ error: "Analysis not found" });
    // Return the AI analysis document as-is (lean object)
    return res.json({
      buildNumber: ai.buildNumber,
      status: ai.analysisStatus,
      failedStage: ai.failedStage ?? null,
      detectedError: ai.detectedError ?? null,
      humanSummary: ai.humanSummary ?? null,
      suggestedFix: ai.suggestedFix ?? null,
      technicalRecommendation: ai.technicalRecommendation ?? null,
      confidenceScore: typeof ai.confidenceScore === 'number' ? ai.confidenceScore : null,
      finalResult: ai.finalResult ?? null,
      generatedAt: ai.generatedAt,
      jobName: ai.jobName,
    });
  } catch (e) {
    console.error("Failed to fetch analysis:", e?.message || e);
    return res.status(502).json({ error: "Failed to fetch analysis" });
  }
}
