// Strict, log-driven Jenkins pipeline analysis
// Rules:
// - Use only information present in the log text
// - No placeholders or empty strings
// - If "AssertionError" appears, classify as Unit Test failure
// - "Deploy skipped due to earlier failure(s)" is a consequence, not a root cause

export function analyzeJenkinsLog(rawLog = '') {
  const text = String(rawLog || '');
  const lines = text.split('\n');

  const hasPipelineError = text.includes('[Pipeline] error');
  const hasFailureFooter = text.includes('Finished: FAILURE');
  const hasAssertion = /AssertionError/.test(text);
  const deploySkipped = /Stage\s+"Deploy"\s+skipped due to earlier failure\(s\)/.test(text);

  // Try to capture the most recent stage name visible in Jenkins logs
  // Pattern: "[Pipeline] { (Stage Name)"
  let failureStage = null;
  const stagePattern = /\[Pipeline\]\s*\{\s*\(([^)]+)\)/; // matches first occurrence on a line
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(stagePattern);
    if (m && m[1]) failureStage = m[1];
    if (lines[i].includes('[Pipeline] error')) break; // stop at error boundary if reached
  }

  // If AssertionError appears, we classify as Unit Test failure explicitly
  if (hasAssertion) failureStage = 'Unit Test';

  // Compose Human Summary strictly from evidence
  let humanSummary = '';
  if (hasPipelineError || hasAssertion || hasFailureFooter) {
    const parts = [];
    if (failureStage) parts.push(`Failure during ${failureStage}`);
    if (hasAssertion) parts.push('AssertionError detected');
    if (hasFailureFooter) parts.push('Pipeline ended with "Finished: FAILURE"');
    humanSummary = parts.join('; ');
  } else {
    humanSummary = 'Pipeline completed successfully.';
  }

  // Suggested Fix grounded in evidence
  const suggestions = [];
  if (hasAssertion) {
    suggestions.push('Review failing assertions in Unit Test and correct the conditions causing "AssertionError".');
  }
  if (hasPipelineError) {
    suggestions.push('Inspect the log region around "[Pipeline] error" to identify the failing step.');
  }
  if (deploySkipped) {
    suggestions.push('Note: "Stage "Deploy" skipped due to earlier failure(s)" is a consequence of the prior failure.');
  }
  if (!suggestions.length && (hasPipelineError || hasFailureFooter)) {
    suggestions.push('Inspect the failing stage logs and address the error before re-running.');
  }
  const suggestedFix = suggestions.join(' ');

  // Technical Recommendation grounded in evidence
  const recs = [];
  if (hasAssertion) {
    recs.push('Pinpoint the test that triggers "AssertionError" and verify expected values in that assertion.');
  }
  if (hasPipelineError) {
    recs.push('Capture the exact step preceding "[Pipeline] error" and validate its inputs/outputs.');
  }
  if (hasFailureFooter) {
    recs.push('Confirm a successful run by ensuring the job does not end with "Finished: FAILURE".');
  }
  if (!recs.length) recs.push('No technical issues detected in logs.');
  const technicalRecommendation = recs.join(' ');

  // Return the detected failure stage under the key `failedStage`
  return { humanSummary, suggestedFix, technicalRecommendation, failedStage: failureStage };
}

export default { analyzeJenkinsLog };
