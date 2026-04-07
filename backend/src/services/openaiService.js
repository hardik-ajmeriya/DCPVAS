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
    text: { format: { type: 'json_object' } },
  });

  let parsed;
  try {
    const content = resp?.output_text || '{}';
    parsed = JSON.parse(content);
  } catch {
    parsed = {
      failedStage: null,
      detectedError: null,
      humanSummary: '',
      suggestedFix: '',
      technicalRecommendation: '',
      confidenceScore: 0,
    };
  }
  const confidence = typeof parsed?.confidenceScore === 'number' ? parsed.confidenceScore : 0;
  const clamped = Math.max(0, Math.min(1, confidence));
  return {
    failedStage: parsed?.failedStage ?? null,
    detectedError: parsed?.detectedError ?? null,
    humanSummary: parsed?.humanSummary ?? null,
    suggestedFix: parsed?.suggestedFix ?? null,
    technicalRecommendation: parsed?.technicalRecommendation ?? null,
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
      if (stageOrder(aiDoc.stage) < ANALYSIS_STAGE.COMPLETED) {
        advanceStage(aiDoc, 'COMPLETED');
        await aiDoc.save();
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
  const cleaned = cleanJenkinsLogs(rawDoc.rawLogs || '');

  // CALLING_OPENAI
  console.log('[AI] Step → CALLING_OPENAI');
  emitProgress('AI_ANALYZING', 'Calling AI model for analysis');
  advanceStage(aiDoc, 'AI_ANALYSIS');
  emitSSEStage('ai_analysis');
  await aiDoc.save();
  let json;
  try {
    json = await analyzeCleanedLogsStrict(cleaned);
  } catch (err) {
    console.error('[AI] OpenAI call failed:', err?.message || err);
    aiDoc.analysisStatus = 'FAILED';
    aiDoc.analysisStep = 'FAILED';
    await aiDoc.save();
    throw err;
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
