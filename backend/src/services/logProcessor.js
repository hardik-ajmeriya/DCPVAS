// Rule-based log processing for Demo Mode

export function extractTailLines(logs, n = 30) {
  const lines = (logs || '').split('\n');
  return lines.slice(-n);
}

export function summarizeLogs(logs) {
  const lines = (logs || '').split('\n');
  const errorKeywords = ['ERROR', 'FAIL', 'Exception', 'Traceback', 'fatal', 'exit code 1'];
  const warningKeywords = ['WARN', 'warning'];

  const errors = lines.filter((l) => errorKeywords.some((k) => l.toLowerCase().includes(k.toLowerCase())));
  const warnCount = lines.filter((l) => warningKeywords.some((k) => l.toLowerCase().includes(k.toLowerCase()))).length;

  const failedStageMatch = (logs || '').match(/FAILED\s+stage:\s+(.*)|Stage\s+(\w+).+failed/i);
  const failedStage = failedStageMatch ? (failedStageMatch[1] || failedStageMatch[2]) : null;

  const cause = inferCause(errors.join('\n').toLowerCase());

  const text = errors.length
    ? `Detected ${errors.length} error lines${failedStage ? `; likely failure in ${failedStage}` : ''}. Common cause: ${cause}.`
    : `No error keywords found. Build appears healthy with ${warnCount} warnings.`;

  return { errors, warnCount, failedStage, text };
}

function inferCause(joined) {
  if (!joined) return 'unknown; inspect logs';
  if (joined.includes('npm') && joined.includes('exit code')) return 'npm script failure';
  if (joined.includes('jest') && joined.includes('failed')) return 'unit tests failing';
  if (joined.includes('docker build') || joined.includes('docker')) return 'docker build issue';
  if (joined.includes('connection refused') || joined.includes('timeout')) return 'deployment connectivity issue';
  if (joined.includes('out of memory')) return 'insufficient memory';
  return 'unknown; inspect logs';
}
