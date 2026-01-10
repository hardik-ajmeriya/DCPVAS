import { analyzeLogsWithOpenAI } from '../services/openaiService.js';
import { cleanJenkinsLogs } from '../services/logSanitizer.js';
import OpenAI from 'openai';

function getModel() {
  // Fixed per requirements
  return 'gpt-5-mini';
}

export function healthOpenAI(req, res) {
  const openaiKeyLoaded = !!process.env.OPENAI_API_KEY;
  const model = getModel();
  return res.json({ openaiKeyLoaded, model });
}

export async function testOpenAIText(req, res) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(400).json({ error: 'OPENAI_API_KEY not configured' });
    const client = new OpenAI({ apiKey });
    const model = getModel();
    const prompt = 'Pipeline failed with AssertionError in TestProgram';
    const resp = await client.responses.create({
      model,
      input: prompt,
    });
    const reply = resp?.output_text || '';
    return res.json({ reply });
  } catch (e) {
    if (e?.status === 429) return res.status(429).json({ error: 'AI quota exceeded', retryAfter: 'later' });
    return res.status(502).json({ error: e?.message || 'OpenAI request failed' });
  }
}

export async function testOpenAIJson(req, res) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(400).json({ error: 'OPENAI_API_KEY not configured' });
    const client = new OpenAI({ apiKey });
    const model = getModel();
    const prompt = [
      'Analyze this Jenkins log and return ONLY valid JSON:',
      '',
      'ERROR: Unit tests failed: AssertionError in TestProgram',
      '',
      'JSON format:',
      '{',
      '  "humanSummary": "",',
      '  "suggestedFix": "",',
      '  "technicalRecommendation": ""',
      '}',
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
      return res.status(500).json({ error: 'Invalid JSON returned by OpenAI' });
    }
    // Strictly return only expected fields
    const out = {
      humanSummary: parsed?.humanSummary || '',
      suggestedFix: parsed?.suggestedFix || '',
      technicalRecommendation: parsed?.technicalRecommendation || '',
    };
    return res.json(out);
  } catch (e) {
    if (e?.status === 429) return res.status(429).json({ error: 'AI quota exceeded', retryAfter: 'later' });
    return res.status(502).json({ error: e?.message || 'OpenAI request failed' });
  }
}

export async function testAnalyzeLog(req, res) {
  try {
    const log = String(req.body?.log || '');
    if (!log) return res.status(400).json({ error: 'Missing log in request body' });
    // Send verbatim logs to model per requirements (no cleaning)
    const json = await analyzeLogsWithOpenAI({ logs: log });
    const out = {
      humanSummary: json?.humanSummary || '',
      suggestedFix: json?.suggestedFix || '',
      technicalRecommendation: json?.technicalRecommendation || '',
      failedStage: json?.failedStage || '',
      detectedError: json?.detectedError || '',
    };
    return res.json(out);
  } catch (e) {
    if (e?.status === 429) return res.status(429).json({ error: 'AI quota exceeded', retryAfter: 'later' });
    return res.status(502).json({ error: e?.message || 'OpenAI analysis failed' });
  }
}

export default { healthOpenAI, testOpenAIText, testOpenAIJson, testAnalyzeLog };
