import { cleanJenkinsLogs } from './logSanitizer.js';

function pickErrorSignature(lines) {
  const patterns = [
    /(AssertionError.*)/i,
    /(npm ERR!.*)/i,
    /(BUILD FAILURE.*)/i,
    /(Gradle .* FAILED.*)/i,
    /(script returned exit code \d+)/i,
    /(command .* exited with code \d+)/i,
    /(fatal: .*)/i,
    /((ECONNREFUSED|ETIMEDOUT|timeout|connection refused).*)/i,
  ];
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    for (const p of patterns) {
      const m = line.match(p);
      if (m) return m[1].toLowerCase();
    }
  }
  // fallback to last non-empty errorish line
  const errish = [...lines].reverse().find((l) => /error|failed|failure|fatal/i.test(l));
  return errish ? errish.toLowerCase() : null;
}

function detectErrorType(text) {
  if (/AssertionError/i.test(text)) return 'AssertionError';
  if (/npm ERR!/i.test(text)) return 'npm error';
  if (/BUILD FAILURE/i.test(text)) return 'Maven build failure';
  if (/Gradle .* FAILED/i.test(text)) return 'Gradle failure';
  if (/fatal:/i.test(text)) return 'Git failure';
  if (/(ECONNREFUSED|ETIMEDOUT|timeout|TLS handshake|Network is unreachable)/i.test(text)) return 'Network/infra error';
  if (/(script returned exit code|exited with code)\s*\d+/i.test(text)) return 'Non-zero exit code';
  return 'Unknown';
}

function detectScriptType(text) {
  if (/(^|\n)\+\s*mvn\b|\bapache maven\b|\[INFO\] Building/i.test(text)) return 'Maven';
  if (/gradle|\[Gradle\]/i.test(text)) return 'Gradle';
  if (/\bnpm\b|\byarn\b|\bpnpm\b/i.test(text)) return 'Node';
  if (/docker\b/i.test(text)) return 'Docker';
  if (/powershell|\.ps1\b/i.test(text)) return 'PowerShell';
  if (/cmd\.exe|\.bat\b/i.test(text)) return 'Windows CMD';
  return 'Shell';
}

function detectBlastRadius(text, stages = []) {
  const skipped = /skipped due to earlier failure\(s\)/i.test(text);
  const manySkipped = stages.filter((s) => s.status === 'SKIPPED').length >= 2;
  const infra = /(ECONNREFUSED|ETIMEDOUT|DNS|registry unavailable|rate limit|permission denied|no space left)/i.test(text);
  if (infra || manySkipped) return 'system-wide';
  if (skipped) return 'system-wide';
  return 'isolated';
}

function confidenceScore(text, stage) {
  let score = 0.2;
  if (stage) score += 0.2;
  if (/AssertionError/i.test(text)) score += 0.3;
  if (/(script returned exit code|exited with code)\s*\d+/i.test(text)) score += 0.2;
  if (/BUILD FAILURE|Gradle .* FAILED|npm ERR!/i.test(text)) score += 0.2;
  return Math.max(0, Math.min(1, score));
}

function recommendedAction(errorType, blast) {
  if (errorType === 'AssertionError' || /Maven|Gradle|Node/.test(errorType)) return 'fix';
  if (errorType === 'Network/infra error' || blast === 'system-wide') return 'rerun';
  if (errorType === 'Unknown') return 'rerun';
  return 'fix';
}

export function computeFailureInsights({ logs = '', stages = [], run }) {
  const cleaned = cleanJenkinsLogs(logs || '');
  const lines = cleaned.split(/\r?\n/);
  const failedStage = stages.find((s) => s.status === 'FAILED')?.name || null;
  const errorType = detectErrorType(cleaned);
  const scriptType = detectScriptType(cleaned);
  const signature = pickErrorSignature(lines) || (failedStage ? `stage:${failedStage}` : 'unknown');
  const blastRadius = detectBlastRadius(cleaned, stages);
  const rootCauseConfidence = confidenceScore(cleaned, failedStage);
  const skippedDeploys = /Stage\s+"Deploy"\s+skipped due to earlier failure\(s\)/i.test(cleaned) || /deploy(ment)?\s+skipped/i.test(cleaned);
  const wastedCiMinutes = run?.durationMs ? Math.round(run.durationMs / 60000) : undefined;

  // Replay: list stages with key events per stage
  const keyEvents = lines.filter((l) => /error|failed|npm ERR!|BUILD FAILURE|fatal:/i.test(l)).slice(-10);
  const replay = stages.map((s) => ({ stage: s.name, status: s.status, durationMs: s.durationMs })).concat(
    keyEvents.length ? [{ stage: 'Key Events', status: 'INFO', keyEvents }] : []
  );

  return {
    failure: {
      stage: failedStage,
      errorType,
      scriptType,
      signature,
      repeatCount: 0, // to be filled by caller
    },
    recommendation: recommendedAction(errorType, blastRadius),
    blastRadius,
    cost: {
      wastedCiMinutes,
      skippedDeploys,
    },
    rootCauseConfidence,
    replay,
  };
}

export function enrichWithRepeats(timeline) {
  const counts = new Map();
  return timeline.map((entry) => {
    const sig = entry.insights.failure.signature || 'unknown';
    const prev = counts.get(sig) || 0;
    counts.set(sig, prev + 1);
    entry.insights.failure.repeatCount = prev; // previous occurrences before this one
    return entry;
  });
}

export default { computeFailureInsights, enrichWithRepeats };
