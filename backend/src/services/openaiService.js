import OpenAI from 'openai';

function getConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  // Model fixed per requirements
  const model = 'gpt-5-mini';
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  return { apiKey, model };
}

function getClient() {
  const { apiKey } = getConfig();
  return new OpenAI({ apiKey });
}

export async function analyzeLogsWithOpenAI({ logs, cleanedLogs }) {
  const { model } = getConfig();
  const client = getClient();

  const prompt = [
    'Analyze the Jenkins console log strictly and return ONLY this JSON schema:',
    '{',
    '  "humanSummary": "",',
    '  "suggestedFix": "",',
    '  "technicalRecommendation": "",',
    '  "failedStage": "",',
    '  "detectedError": ""',
    '}',
    '',
    'Rules:',
    '- Base findings strictly on the provided log text.',
    '- If log contains "AssertionError" → detectedError = UNIT_TEST_FAILURE.',
    '- If log shows "[Pipeline] bat" → script type is Windows Batch.',
    '- If log says "Deploy skipped due to earlier failure(s)" → treat as consequence, not root cause.',
    '- Never say "unknown" if the log states the stage or error.',
    '- Provide CODE-LEVEL technicalRecommendation (e.g., assertion fix, Jenkinsfile step, batch command change).',
    '',
    'Log:',
    (logs ?? cleanedLogs) || '(no logs)'
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
      humanSummary: '',
      suggestedFix: '',
      technicalRecommendation: '',
      failedStage: '',
      detectedError: '',
    };
  }
  // Ensure shape contains only required keys
  parsed = {
    humanSummary: parsed?.humanSummary ?? '',
    suggestedFix: parsed?.suggestedFix ?? '',
    technicalRecommendation: parsed?.technicalRecommendation ?? '',
    failedStage: parsed?.failedStage ?? '',
    detectedError: parsed?.detectedError ?? '',
  };
  return parsed;
}

export default { analyzeLogsWithOpenAI };
