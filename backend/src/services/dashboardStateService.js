import { getLatestPipelineRun } from './pipelineService.js';
import { getHistory } from './pipelineDataService.js';
import { computeDashboardMetrics } from './dashboardMetricsService.js';
import { getLatestPipelineStages } from './jenkinsService.js';
import PipelineAIAnalysis from '../models/PipelineAIAnalysis.js';

const ANALYSIS_STAGE = {
  FETCH_LOGS: 1,
  FILTER_ERRORS: 2,
  AI_ANALYSIS: 3,
  STORE_RESULTS: 4,
  COMPLETED: 5,
  SKIPPED: 6,
};

function deriveAiStatus(doc, jobName, buildNumber) {
  if (!doc && !jobName && !buildNumber) return null;

  const currentStage = String(doc?.stage || doc?.analysisStatus || 'FETCH_LOGS').toUpperCase();
  const stageKey = ANALYSIS_STAGE[currentStage] ? currentStage : 'FETCH_LOGS';
  const normalizedStage = stageKey.toLowerCase();

  const completedSteps = Object.entries(ANALYSIS_STAGE)
    .filter(([, idx]) => idx < ANALYSIS_STAGE[stageKey])
    .map(([key]) => key.toLowerCase());

  const runningStep = normalizedStage;
  const skipped =
    stageKey === 'SKIPPED' || String(doc?.analysisStatus || '').toUpperCase() === 'SKIPPED';

  return {
    jobName,
    buildNumber,
    stage: normalizedStage,
    status: doc?.analysisStatus?.toLowerCase?.() || 'pending',
    completedSteps,
    runningStep,
    skipped,
  };
}

export async function buildDashboardState(eventMeta) {
  try {
    const [latestRun, history, metrics] = await Promise.all([
      getLatestPipelineRun().catch((e) => {
        console.error('[dashboardState] getLatestPipelineRun failed:', e?.message || e);
        return null;
      }),
      getHistory(50).catch((e) => {
        console.error('[dashboardState] getHistory failed:', e?.message || e);
        return [];
      }),
      computeDashboardMetrics().catch((e) => {
        console.error('[dashboardState] computeDashboardMetrics failed:', e?.message || e);
        return {
          totalPipelines: 0,
          activeBuilds: 0,
          failedToday: 0,
          avgFixTimeSeconds: 0,
          aiAccuracy: 0,
        };
      }),
    ]);

    let stages = [];
    try {
      const flow = await getLatestPipelineStages();
      stages = Array.isArray(flow?.stages) ? flow.stages : [];
    } catch (err) {
      const msg = err?.message || String(err || '');
      if (msg !== 'Jenkins not configured') {
        console.error('[dashboardState] getLatestPipelineStages failed:', msg);
      }
      stages = [];
    }

    let aiStatus = null;
    let aiAnalysis = null;
    if (latestRun?.jobName && latestRun?.buildNumber != null) {
      const aiDoc = await PipelineAIAnalysis.findOne({
        jobName: latestRun.jobName,
        buildNumber: latestRun.buildNumber,
      })
        .sort({ updatedAt: -1 })
        .lean()
        .catch((e) => {
          console.error('[dashboardState] PipelineAIAnalysis lookup failed:', e?.message || e);
          return null;
        });
      aiStatus = deriveAiStatus(aiDoc, latestRun.jobName, latestRun.buildNumber);
      // Expose full AI document on the dashboard state so SSE consumers and
      // REST snapshots can bind directly to aiAnalysis without changing the
      // underlying analysis pipeline.
      if (aiDoc) {
        aiAnalysis = aiDoc;
      }
    }

    const pipelines = Array.isArray(history) ? history : [];
    const failures = pipelines.filter((r) => {
      const s = String(r?.status || '').toUpperCase();
      return s === 'FAILURE' || s === 'FAILED';
    });

    const latestBuild = latestRun || null;

    const state = {
      latestBuild,
      pipelines,
      failures,
      metrics,
      aiStatus,
      aiAnalysis,
      stages,
    };

    if (eventMeta && eventMeta.type) {
      return { ...state, eventType: eventMeta.type };
    }

    return state;
  } catch (err) {
    console.error('[dashboardState] buildDashboardState unexpected failure:', err?.message || err);
    return {
      latestBuild: null,
      pipelines: [],
      failures: [],
      metrics: {
        totalPipelines: 0,
        activeBuilds: 0,
        failedToday: 0,
        avgFixTimeSeconds: 0,
        aiAccuracy: 0,
      },
      aiStatus: null,
      stages: [],
      error: 'Failed to build dashboard state',
    };
  }
}

export default { buildDashboardState };
