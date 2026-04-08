import OpenAI from 'openai';
import { cleanJenkinsLogs } from './logSanitizer.js';
import PipelineAIAnalysis from '../models/PipelineAIAnalysis.js';
import PipelineAnalysisAudit from '../models/PipelineAnalysisAudit.js';
import { broadcastEvent } from './eventStreamService.js';

const ANALYSIS_STAGE = {
  FETCH_LOGS: 1,
  FILTER_ERRORS: 2,
  AI_ANALYSIS: 3,
  STORE_RESULTS: 4,
  COMPLETED: 5,
  SKIPPED: 6,
};

function stageOrder(value) {
  return ANALYSIS_STAGE[String(value || '').toUpperCase()] || 0;
}

function advanceStage(doc, nextStage) {
  const current = stageOrder(doc?.stage || doc?.analysisStatus);
  const nxt = stageOrder(nextStage);
  if (!nxt || nxt < current) return false;
  doc.stage = nextStage;
  const statusMap = {
    FETCH_LOGS: 'FETCHING_LOGS',
    FILTER_ERRORS: 'FILTERING_ERRORS',
    AI_ANALYSIS: 'AI_ANALYZING',
    STORE_RESULTS: 'STORING_RESULTS',
    COMPLETED: 'COMPLETED',
    SKIPPED: 'COMPLETED',
  };
  doc.analysisStatus = statusMap[nextStage] || doc.analysisStatus;
  doc.analysisStep = statusMap[nextStage] || doc.analysisStep;
  return true;
}
// Progress is now persisted in MongoDB via PipelineAIAnalysis; in-memory helper removed for API reads.

function getConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = 'gpt-5-mini';
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  return { apiKey, model };
}

function getClient() {
  const { apiKey } = getConfig();
  return new OpenAI({ apiKey });
}

export function healthOpenAI() {
  const key = !!process.env.OPENAI_API_KEY;
  const { model } = getConfig();
  return { openaiKeyLoaded: key, model };
}

export async function analyzeCleanedLogsStrict(inputLogs) {
  const { model } = getConfig();
  const client = getClient();

  const cleaned = cleanJenkinsLogs(inputLogs || '');
  const systemRules = [
    'You are an AI system performing expert-level CI/CD pipeline failure analysis for DevOps engineers and software developers.',
    'You will receive cleaned Jenkins console logs and pipeline metadata.',
    'Analyze strictly based on evidence. Do NOT guess. If unclear, explicitly state it.',
    'Return ONLY valid JSON. No markdown, emojis, or extra explanations outside JSON.',
    'Language must be clear, technical, and actionable; suitable for dashboards.',
  ].join('\n');

  const requiredSchema = [
    '{',
    '  "failedStage": null,',
    '  "detectedError": null,',
    '  "humanSummary": {',
    '    "overview": "",',
    '    "failureCause": [""],',
    '    "pipelineImpact": [""]',
    '  },',
    '  "suggestedFix": {',
    '    "immediateActions": [""],',
    '    "debuggingSteps": [""],',
    '    "verification": [""]',
    '  },',
    '  "technicalRecommendation": {',
    '    "codeLevelActions": [""],',
    '    "pipelineImprovements": [""],',
    '    "preventionStrategies": [""]',
    '  },',
    '  "confidenceScore": 0.0',
    '}',
  ].join('\n');

  const prompt = [
    systemRules,
    '',
    'Required JSON format:',
    requiredSchema,
    '',
    'Logs (cleaned):',
    cleaned || '(no logs)'
  ].join('\n');

  const resp = await client.responses.create({
    model,
    input: prompt,
    // Ask the Responses API to format the text output as a single JSON object.
    text: { format: { type: 'json_object' } },
  });

  // Debug raw response for troubleshooting parsing issues.
  try {
    console.log('[AI] RAW RESPONSE META:', {
      id: resp?.id,
      outputCount: Array.isArray(resp?.output) ? resp.output.length : 0,
      outputTypes: Array.isArray(resp?.output) ? resp.output.map((o) => o?.type) : [],
    });
  } catch {}

  // Helper to normalise list-like fields into string arrays
  const toStringArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((v) => String(v)).map((s) => s.trim()).filter(Boolean);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }
    return [];
  };

  let parsed = {};
  try {
    const firstOutput = Array.isArray(resp?.output) && resp.output.length > 0 ? resp.output[0] : null;
    const firstContent = Array.isArray(firstOutput?.content) && firstOutput.content.length > 0
      ? firstOutput.content[0]
      : null;

    // If the SDK already parsed JSON for us, prefer that.
    if (firstContent && typeof firstContent.json === 'object' && firstContent.json !== null) {
      parsed = firstContent.json;
    } else {
      // Fall back to text content and parse it as JSON manually.
      let textContent = '';
      if (firstContent?.text) {
        if (typeof firstContent.text === 'string') {
          textContent = firstContent.text;
        } else if (typeof firstContent.text.value === 'string') {
          textContent = firstContent.text.value;
        }
      } else if (typeof resp?.output_text === 'string') {
        // Legacy/alternate field some SDKs expose
        textContent = resp.output_text;
      }

      console.log('[AI] RAW RESPONSE TEXT:', textContent);

      if (!textContent || typeof textContent !== 'string') {
        throw new Error('Empty AI response text');
      }

      parsed = JSON.parse(textContent);
    }
  } catch (err) {
    console.error('[AI] Failed to parse AI JSON response:', err?.message || err);
    throw err;
  }

  // ------- Normalise fields into the strict dashboard schema -------

  const failedStage = parsed?.failedStage ?? parsed?.stage ?? null;
  const detectedError = parsed?.detectedError ?? parsed?.error ?? parsed?.rootCause ?? null;

  // Human Summary
  let humanSummary = null;
  const hsObj = parsed && typeof parsed.humanSummary === 'object' && parsed.humanSummary !== null
    ? parsed.humanSummary
    : null;

  const overviewFromHs = typeof hsObj?.overview === 'string' ? hsObj.overview : '';
  const overviewFallback =
    (typeof parsed?.summary === 'string' && parsed.summary) ||
    (typeof parsed?.overview === 'string' && parsed.overview) ||
    '';
  const overview = (overviewFromHs || overviewFallback).trim();

  const failureCauseArr = toStringArray(hsObj?.failureCause || parsed?.failureCause || parsed?.rootCause);
  const pipelineImpactArr = toStringArray(hsObj?.pipelineImpact || parsed?.pipelineImpact || parsed?.impact);

  if (overview || failureCauseArr.length || pipelineImpactArr.length) {
    humanSummary = {
      overview,
      failureCause: failureCauseArr,
      pipelineImpact: pipelineImpactArr,
    };
  }

  // Suggested Fix
  let suggestedFix = null;
  const sfObj = parsed && typeof parsed.suggestedFix === 'object' && parsed.suggestedFix !== null
    ? parsed.suggestedFix
    : null;

  const immediateActionsArr = toStringArray(
    sfObj?.immediateActions || parsed?.fix || parsed?.suggestion || parsed?.immediateActions,
  );
  const debuggingStepsArr = toStringArray(sfObj?.debuggingSteps || parsed?.debugSteps || parsed?.debuggingSteps);
  const verificationArr = toStringArray(sfObj?.verification || parsed?.verification);

  if (immediateActionsArr.length || debuggingStepsArr.length || verificationArr.length) {
    suggestedFix = {
      immediateActions: immediateActionsArr,
      debuggingSteps: debuggingStepsArr,
      verification: verificationArr,
    };
  }

  // Technical Recommendation
  let technicalRecommendation = null;
  const trObj = parsed && typeof parsed.technicalRecommendation === 'object' && parsed.technicalRecommendation !== null
    ? parsed.technicalRecommendation
    : null;

  const codeActionsArr = toStringArray(
    trObj?.codeLevelActions || parsed?.technical || parsed?.codeActions || parsed?.codeLevelActions,
  );
  const pipelineImprovementsArr = toStringArray(
    trObj?.pipelineImprovements || parsed?.pipelineImprovements,
  );
  const preventionArr = toStringArray(
    trObj?.preventionStrategies || parsed?.prevention || parsed?.preventionStrategies,
  );

  if (codeActionsArr.length || pipelineImprovementsArr.length || preventionArr.length) {
    technicalRecommendation = {
      codeLevelActions: codeActionsArr,
      pipelineImprovements: pipelineImprovementsArr,
      preventionStrategies: preventionArr,
    };
  }

  // Confidence score normalisation (support 0–1 and 0–100)
  let confidenceRaw =
    parsed?.confidenceScore ?? parsed?.confidence ?? parsed?.score ?? 0;
  let confidence = typeof confidenceRaw === 'number' ? confidenceRaw : 0;
  if (confidence > 1 && confidence <= 100) {
    confidence /= 100;
  }
  const clamped = Math.max(0, Math.min(1, confidence));

  const hasAnyContent = Boolean(
    (humanSummary && (humanSummary.overview || humanSummary.failureCause.length || humanSummary.pipelineImpact.length)) ||
      suggestedFix ||
      technicalRecommendation,
  );

  if (!hasAnyContent) {
    console.error('[AI] Empty analysis payload from AI (no summary/fix/recommendation).');
  }

  return {
    failedStage,
    detectedError,
    humanSummary,
    suggestedFix,
    technicalRecommendation,
    confidenceScore: clamped,
  };
}

// Store AI analysis for a raw Jenkins log and optionally emit socket progress events.
// options: { io?: SocketIOServer, room?: string }
export async function storeAIAnalysisForRawLog(rawDoc, options = {}) {
  const { model } = getConfig();
  if (!rawDoc) throw new Error('rawDoc is required');

  // Only analyze failed builds; skip SUCCESS to conserve resources
  if (rawDoc.status !== 'FAILURE') {
    const { io, room } = options || {};
    if (io) {
      if (room) io.to(room).emit('analysis:skipped', { buildNumber: rawDoc.buildNumber, reason: 'NOT_REQUIRED' });
      else io.emit('analysis:skipped', { buildNumber: rawDoc.buildNumber, reason: 'NOT_REQUIRED' });
    }
    try {
      await rawDoc.updateOne({ $set: { analysisStatus: 'NOT_REQUIRED' } });
      await PipelineAIAnalysis.findOneAndUpdate(
        { rawLogRef: rawDoc._id, jobName: rawDoc.jobName, buildNumber: rawDoc.buildNumber },
        {
          $setOnInsert: {
            analysisSource: 'OPENAI_GPT',
            aiModel: getConfig().model,
            analysisVersion: 'v1',
            generatedAt: new Date(),
            finalResult: rawDoc.status || 'SUCCESS',
          },
          $set: {
            analysisStatus: 'COMPLETED',
            analysisRunStatus: 'COMPLETED',
            analysisStep: 'COMPLETED',
            stage: 'SKIPPED',
            confidenceScore: null,
            failedStage: null,
            detectedError: null,
            humanSummary: null,
            suggestedFix: null,
            technicalRecommendation: null,
          },
        },
        { new: true, upsert: true }
      );
      const payload = { buildNumber: rawDoc.buildNumber, jobName: rawDoc.jobName, status: 'skipped' };
      try {
        broadcastEvent({ type: 'analysis_update', stage: 'skipped', ...payload });
        broadcastEvent({ type: 'analysis_complete', ...payload });
        broadcastEvent({ type: 'analysis_completed', ...payload });
      } catch {}
    } catch {}
    return { buildNumber: rawDoc.buildNumber, aiAnalysis: { skipped: true, reason: 'NO_FAILURE_DETECTED' } };
  }
  const { io, room } = options || {};
  const emitSSEStage = (stage) => {
    const normalizedStage = String(stage || '').toLowerCase();
    try {
      broadcastEvent({ type: 'analysis_update', jobName: rawDoc.jobName, buildNumber: rawDoc.buildNumber, stage: normalizedStage });
    } catch {}
  };
  const emitSSEComplete = (status = 'completed') => {
    const payload = { jobName: rawDoc.jobName, buildNumber: rawDoc.buildNumber, status };
    try {
      broadcastEvent({ type: 'analysis_complete', ...payload });
      broadcastEvent({ type: 'analysis_completed', ...payload });
    } catch {}
  };
  const emitProgress = (stage, message) => {
    if (io) {
      const emitter = room ? io.to(room) : io;
      emitter.emit('analysis:progress', {
        buildNumber: rawDoc.buildNumber,
        status: stage,
        stage,
        message,
      });
    }
  };
  const emitStarted = () => {
    if (io) {
      const emitter = room ? io.to(room) : io;
      emitter.emit('analysis:started', {
        buildNumber: rawDoc.buildNumber,
      });
    }
  };
  const emitComplete = (analysis) => {
    if (io) {
      const emitter = room ? io.to(room) : io;
      const payload = {
        buildNumber: rawDoc.buildNumber,
        status: 'COMPLETED',
        // Backward-compatible top-level fields
        humanSummary: analysis?.humanSummary ?? null,
        suggestedFix: analysis?.suggestedFix ?? null,
        technicalRecommendation: analysis?.technicalRecommendation ?? null,
        confidenceScore: typeof analysis?.confidenceScore === 'number' ? analysis.confidenceScore : null,
        // New nested analysis object for consumers expecting a single blob
        analysis: {
          humanSummary: analysis?.humanSummary ?? null,
          suggestedFix: analysis?.suggestedFix ?? null,
          technicalRecommendation: analysis?.technicalRecommendation ?? null,
          confidenceScore: typeof analysis?.confidenceScore === 'number' ? analysis.confidenceScore : null,
        },
      };
      // Emit both for compatibility; prefer 'analysis:complete' per spec
      emitter.emit('analysis:complete', payload);
      emitter.emit('analysis:completed', payload);
    }
    // SSE broadcast for dashboard without sockets
    try {
      broadcastEvent({ type: 'analysis_complete', buildNumber: rawDoc.buildNumber, jobName: rawDoc.jobName, status: 'completed' });
    } catch {}
  };

  // Upsert initial analysis document with IN_PROGRESS and FETCH_LOGS
  console.log(`[AI] Step → FETCHING_LOGS (build #${rawDoc.buildNumber})`);
  emitProgress('FETCHING_LOGS', 'Starting to fetch and prepare logs');
  emitSSEStage('fetch_logs');
  let aiDoc = await PipelineAIAnalysis.findOneAndUpdate(
    { rawLogRef: rawDoc._id, jobName: rawDoc.jobName, buildNumber: rawDoc.buildNumber },
    {
      $setOnInsert: {
        analysisSource: 'OPENAI_GPT',
        aiModel: model,
        analysisVersion: 'v1',
        generatedAt: new Date(),
        finalResult: rawDoc.status || 'FAILURE',
      },
      $set: {
        analysisStatus: 'FETCHING_LOGS',
        analysisRunStatus: 'PENDING',
        analysisStep: 'FETCHING_LOGS',
        stage: 'FETCH_LOGS',
        failedStage: null,
        detectedError: null,
        humanSummary: null,
        suggestedFix: null,
        technicalRecommendation: null,
        confidenceScore: null,
      },
    },
    { new: true, upsert: true }
  );
  await aiDoc.save();

  const timeoutGuard = setTimeout(async () => {
    try {
      // Only auto-complete if we haven't already marked this run as FAILED.
      if (stageOrder(aiDoc.stage) < ANALYSIS_STAGE.COMPLETED && aiDoc.analysisStatus !== 'FAILED') {
        // Timeout: treat as a failed terminal state but advance the
        // stage so the UI does not remain mid-pipeline.
        advanceStage(aiDoc, 'COMPLETED');
        aiDoc.analysisStatus = 'FAILED';
        aiDoc.analysisStep = 'FAILED';
        aiDoc.analysisRunStatus = 'FAILED';
        aiDoc.errorMessage = 'AI analysis timeout';
        await aiDoc.save();
        try {
          await rawDoc.updateOne({ $set: { analysisStatus: 'FAILED' } });
        } catch {}
        console.error('[AI] TIMEOUT: analysis exceeded time budget; marking as FAILED');
        emitSSEStage('completed');
        emitSSEComplete('timeout');
      }
    } catch {}
  }, 30000);

  // CLEANING_LOGS
  console.log('[AI] Step → CLEANING_LOGS');
  emitStarted();
  emitProgress('FILTERING_ERRORS', 'Cleaning logs and filtering errors');
  advanceStage(aiDoc, 'FILTER_ERRORS');
  emitSSEStage('filter_errors');
  aiDoc.analysisRunStatus = 'RUNNING';
  await aiDoc.save();
  const sourceLogs = rawDoc.rawLogs || rawDoc.logs || '';
  console.log('[AI] STARTED analysis for build', rawDoc.buildNumber);
  console.log('[AI] Logs length:', sourceLogs ? sourceLogs.length : 0);

  if (!sourceLogs || sourceLogs.length < 100) {
    console.error(
      `[AI] Insufficient logs for analysis (build #${rawDoc.buildNumber}) length=${sourceLogs.length}`,
    );
    // Advance stage so the UI stepper reaches the end, while status
    // fields clearly indicate a failure.
    advanceStage(aiDoc, 'COMPLETED');
    aiDoc.analysisStatus = 'FAILED';
    aiDoc.analysisStep = 'FAILED';
    aiDoc.analysisRunStatus = 'FAILED';
    aiDoc.errorMessage = `Insufficient logs for analysis (length=${sourceLogs.length})`;
    await aiDoc.save();
    try {
      await rawDoc.updateOne({ $set: { analysisStatus: 'FAILED' } });
    } catch {}
    emitSSEComplete('failed');
    clearTimeout(timeoutGuard);
    return aiDoc.toObject();
  }

  const cleaned = cleanJenkinsLogs(sourceLogs);

  // CALLING_OPENAI
  console.log('[AI] Step → CALLING_OPENAI');
  emitProgress('AI_ANALYZING', 'Calling AI model for analysis');
  advanceStage(aiDoc, 'AI_ANALYSIS');
  emitSSEStage('ai_analysis');
  await aiDoc.save();
  let json;
  try {
    json = await analyzeCleanedLogsStrict(cleaned);
    console.log('[AI] ANALYSIS RESULT (normalized):', json);
  } catch (err) {
    console.error('[AI] OpenAI call failed:', err?.message || err);
    // Mark the stage as completed so the stepper does not remain
    // visually stuck in "AI Analyzing" while keeping the logical
    // status as FAILED for diagnostics.
    advanceStage(aiDoc, 'COMPLETED');
    aiDoc.analysisStatus = 'FAILED';
    aiDoc.analysisStep = 'FAILED';
    aiDoc.analysisRunStatus = 'FAILED';
    aiDoc.errorMessage = err?.message || 'AI analysis failed';
    await aiDoc.save();
    try {
      await rawDoc.updateOne({ $set: { analysisStatus: 'FAILED' } });
    } catch {}
    emitProgress('FAILED', 'Analysis failed');
    emitSSEComplete('failed');
    clearTimeout(timeoutGuard);
    return aiDoc.toObject();
  }

  // SAVING_RESULT
  console.log('[AI] Step → SAVING_RESULT');
  emitProgress('STORING_RESULTS', 'Storing analysis results in database');
  advanceStage(aiDoc, 'STORE_RESULTS');
  emitSSEStage('store_results');
  aiDoc.failedStage = json.failedStage ?? null;
  aiDoc.detectedError = json.detectedError ?? null;
  aiDoc.humanSummary = json.humanSummary ?? null;
  aiDoc.suggestedFix = json.suggestedFix ?? null;
  aiDoc.technicalRecommendation = json.technicalRecommendation ?? null;
  aiDoc.confidenceScore = typeof json.confidenceScore === 'number' ? json.confidenceScore : null;
  await aiDoc.save();

  // READY
  console.log(`[AI] Step → COMPLETED (build #${rawDoc.buildNumber})`);
  advanceStage(aiDoc, 'COMPLETED');
  aiDoc.analysisRunStatus = 'COMPLETED';
  await aiDoc.save();
  emitProgress('COMPLETED', 'Analysis completed');
  emitComplete(aiDoc.toObject());
  emitSSEStage('completed');
  emitSSEComplete('completed');
  // Record audit so server restarts do not retrigger AI
  try {
    await PipelineAnalysisAudit.findOneAndUpdate(
      { jobName: rawDoc.jobName, buildNumber: rawDoc.buildNumber },
      { $setOnInsert: { analyzedAt: new Date() }, $set: { analysisStatus: 'COMPLETED' } },
      { upsert: true, new: true }
    );
    // Update raw build doc summary
    await rawDoc.updateOne({
      $set: {
        analysisStatus: 'COMPLETED',
        analyzedAt: new Date(),
        confidenceScore: typeof aiDoc.confidenceScore === 'number' ? aiDoc.confidenceScore : null,
      },
    });
  } catch {}
  clearTimeout(timeoutGuard);
  return aiDoc.toObject();
}

export default { analyzeCleanedLogsStrict, storeAIAnalysisForRawLog, healthOpenAI };
