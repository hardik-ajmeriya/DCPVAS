import OpenAI from 'openai';
import { cleanJenkinsLogs } from './logSanitizer.js';
import PipelineAIAnalysis from '../models/PipelineAIAnalysis.js';
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

export async function storeAIAnalysisForRawLog(rawDoc) {
  const { model } = getConfig();
  if (!rawDoc) throw new Error('rawDoc is required');

  // Upsert initial analysis document with IN_PROGRESS and FETCHING_LOGS
  console.log(`[AI] Step → FETCHING_LOGS (build #${rawDoc.buildNumber})`);
  let aiDoc = await PipelineAIAnalysis.findOneAndUpdate(
    { rawLogRef: rawDoc._id, jobName: rawDoc.jobName, buildNumber: rawDoc.buildNumber },
    {
      $setOnInsert: {
        analysisSource: 'OPENAI_GPT',
        aiModel: model,
        analysisVersion: 'v1',
        generatedAt: new Date(),
      },
      $set: {
        analysisStatus: 'ANALYSIS_IN_PROGRESS',
        analysisStep: 'FETCHING_LOGS',
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

  // CLEANING_LOGS
  console.log('[AI] Step → CLEANING_LOGS');
  aiDoc.analysisStep = 'CLEANING_LOGS';
  await aiDoc.save();
  const cleaned = cleanJenkinsLogs(rawDoc.rawLogs || '');

  // CALLING_OPENAI
  console.log('[AI] Step → CALLING_OPENAI');
  aiDoc.analysisStep = 'CALLING_OPENAI';
  await aiDoc.save();
  let json;
  try {
    json = await analyzeCleanedLogsStrict(cleaned);
  } catch (err) {
    console.error('[AI] OpenAI call failed:', err?.message || err);
    aiDoc.analysisStep = 'FAILED';
    await aiDoc.save();
    throw err;
  }

  // SAVING_RESULT
  console.log('[AI] Step → SAVING_RESULT');
  aiDoc.analysisStep = 'SAVING_RESULT';
  aiDoc.failedStage = json.failedStage ?? null;
  aiDoc.detectedError = json.detectedError ?? null;
  aiDoc.humanSummary = json.humanSummary ?? null;
  aiDoc.suggestedFix = json.suggestedFix ?? null;
  aiDoc.technicalRecommendation = json.technicalRecommendation ?? null;
  aiDoc.confidenceScore = typeof json.confidenceScore === 'number' ? json.confidenceScore : null;
  await aiDoc.save();

  // READY
  console.log(`[AI] Step → READY (build #${rawDoc.buildNumber})`);
  aiDoc.analysisStatus = 'READY';
  aiDoc.analysisStep = 'READY';
  await aiDoc.save();
  return aiDoc.toObject();
}

export default { analyzeCleanedLogsStrict, storeAIAnalysisForRawLog, healthOpenAI };
