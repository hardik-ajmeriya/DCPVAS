import { useEffect, useState } from 'react';
import { getRawLogs } from '../services/api.js';

const tabs = ['Human Summary', 'Suggested Fix', 'Technical Recommendation', 'Raw Logs'];

function ProgressBar({ step }) {
  const percent = mapStepToPercent(step);
  const label = mapStepToLabel(step);
  return (
    <div className="mt-3">
      <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
        <div
          className="bg-blue-600 h-2"
          style={{ width: `${percent}%`, transition: 'width 0.5s ease' }}
        />
      </div>
      <div className="text-xs text-gray-600 mt-1 flex items-center justify-between">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
    </div>
  );
}

function mapStepToPercent(step) {
  switch (step) {
    // New Socket.IO stages → percentage mapping
    case 'FETCHING_LOGS':
      return 10;
    case 'FILTERING_ERRORS':
      return 30;
    case 'AI_ANALYZING':
      return 60;
    case 'STORING_RESULTS':
      return 85;
    case 'COMPLETED':
      return 100;
    // Legacy internal step names fallback
    case 'CLEANING_LOGS':
      return 30;
    case 'CALLING_OPENAI':
      return 60;
    case 'SAVING_RESULT':
      return 85;
    case 'READY':
      return 100;
    default:
      return 10;
  }
}

function mapStepToLabel(step) {
  switch (step) {
    case 'FETCHING_LOGS':
      return 'Fetching logs';
    case 'FILTERING_ERRORS':
      return 'Filtering errors';
    case 'AI_ANALYZING':
      return 'AI analyzing';
    case 'STORING_RESULTS':
      return 'Storing results';
    case 'COMPLETED':
    case 'READY':
      return 'Completed';
    case 'CLEANING_LOGS':
      return 'Cleaning logs';
    case 'CALLING_OPENAI':
      return 'Calling AI';
    case 'SAVING_RESULT':
      return 'Saving result';
    default:
      return 'Preparing';
  }
}

export default function FailureAnalysis({ run }) {
  const [tab, setTab] = useState('Human Summary');
  const [logs, setLogs] = useState(null);
  const analysis = run?.analysis || run || {};
  const buildNumber = run?.buildNumber || analysis?.buildNumber;
  const status = run?.analysisStatus || analysis?.analysisStatus;
  const step = run?.analysisStep || analysis?.analysisStep;
  // Auto-switch to Human Summary when analysis completes
  useEffect(() => {
    if (status === 'READY' || step === 'COMPLETED') {
      setTab('Human Summary');
    }
  }, [status, step]);

  useEffect(() => {
    // reset logs when run changes
    setLogs(null);
  }, [buildNumber]);

  return (
    <div className="p-4 bg-white rounded shadow mt-4">
      <div className="font-semibold mb-3">Failure Analysis</div>

      <div className="flex gap-2 mb-3">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 rounded ${tab === t ? 'bg-neutral text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Human Summary' && (
        <div>
          <h3 className="font-semibold">Human Summary</h3>
          {status === 'ANALYSIS_IN_PROGRESS' || analysis.humanSummary == null ? (
            <div>
              <p className="text-sm text-gray-600">Analyzing logs… please wait</p>
              <ProgressBar step={step} />
            </div>
          ) : (
            <div className="space-y-3">
              {analysis.humanSummary?.overview && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.humanSummary.overview}</p>
              )}
              {Array.isArray(analysis.humanSummary?.failureCause) && analysis.humanSummary.failureCause.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-800">Failure Cause</div>
                  <ul className="list-disc ml-5 text-sm text-gray-700">
                    {analysis.humanSummary.failureCause.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(analysis.humanSummary?.pipelineImpact) && analysis.humanSummary.pipelineImpact.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-800">Pipeline Impact</div>
                  <ul className="list-disc ml-5 text-sm text-gray-700">
                    {analysis.humanSummary.pipelineImpact.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {typeof analysis.confidenceScore === 'number' && (
            <div className="mt-4">
              <div className="text-xs text-gray-600 mb-1">AI Confidence</div>
              <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                <div
                  className="bg-green-600 h-2"
                  style={{ width: `${Math.round((analysis.confidenceScore || 0) * 100)}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1">{Math.round((analysis.confidenceScore || 0) * 100)}%</div>
            </div>
          )}
        </div>
      )}

      {tab === 'Suggested Fix' && (
        <div>
          <h3 className="font-semibold">Suggested Fix</h3>
          {status === 'ANALYSIS_IN_PROGRESS' || analysis.suggestedFix == null ? (
            <div>
              <p className="text-sm text-gray-600">Analyzing logs… please wait</p>
              <ProgressBar step={step} />
            </div>
          ) : (
            <div className="space-y-3">
              {Array.isArray(analysis.suggestedFix?.immediateActions) && analysis.suggestedFix.immediateActions.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-800">Immediate Actions</div>
                  <ul className="list-disc ml-5 text-sm text-gray-700">
                    {analysis.suggestedFix.immediateActions.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(analysis.suggestedFix?.debuggingSteps) && analysis.suggestedFix.debuggingSteps.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-800">Debugging Steps</div>
                  <ul className="list-disc ml-5 text-sm text-gray-700">
                    {analysis.suggestedFix.debuggingSteps.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(analysis.suggestedFix?.verification) && analysis.suggestedFix.verification.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-800">Verification</div>
                  <ul className="list-disc ml-5 text-sm text-gray-700">
                    {analysis.suggestedFix.verification.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'Technical Recommendation' && (
        <div>
          <h3 className="font-semibold">Technical Recommendation</h3>
          {status === 'ANALYSIS_IN_PROGRESS' || analysis.technicalRecommendation == null ? (
            <div>
              <p className="text-sm text-gray-600">Analyzing logs… please wait</p>
              <ProgressBar step={step} />
            </div>
          ) : (
            <div className="space-y-3">
              {Array.isArray(analysis.technicalRecommendation?.codeLevelActions) && analysis.technicalRecommendation.codeLevelActions.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-100 bg-gray-900 rounded px-3 py-2">Code-level Actions</div>
                  <pre className="text-sm bg-gray-900 text-gray-100 p-3 rounded whitespace-pre-wrap font-mono">
                    {analysis.technicalRecommendation.codeLevelActions.join('\n')}
                  </pre>
                </div>
              )}
              {Array.isArray(analysis.technicalRecommendation?.pipelineImprovements) && analysis.technicalRecommendation.pipelineImprovements.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-800">Pipeline Improvements</div>
                  <ul className="list-disc ml-5 text-sm text-gray-700">
                    {analysis.technicalRecommendation.pipelineImprovements.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(analysis.technicalRecommendation?.preventionStrategies) && analysis.technicalRecommendation.preventionStrategies.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-800">Prevention Strategies</div>
                  <ul className="list-disc ml-5 text-sm text-gray-700">
                    {analysis.technicalRecommendation.preventionStrategies.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'Raw Logs' && (
        <div>
          <h3 className="font-semibold">Raw Logs</h3>
          <RawLogs buildNumber={buildNumber} logs={logs} setLogs={setLogs} />
        </div>
      )}
    </div>
  );
}

function RawLogs({ buildNumber, logs, setLogs }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lines, setLines] = useState([]);

  useEffect(() => {
    if (!buildNumber || logs != null) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getRawLogs(buildNumber);
        if (mounted) {
          const text = res?.rawLogs || '';
          setLogs(text);
          setLines(text.split(/\r?\n/));
          setError('');
        }
      } catch (e) {
        if (mounted) setError('Failed to load logs');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [buildNumber, logs, setLogs]);

  if (!buildNumber) return <div className="text-sm text-gray-500">No build selected.</div>;
  if (loading) return <div className="text-sm text-gray-500">Loading logs…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  // Syntax-colored terminal-style rendering
  const getColor = (line) => {
    if (/\b(ERROR|EXCEPTION|FATAL)\b/i.test(line) || /Finished:\s*FAILURE/i.test(line) || /\bFAILED\b/i.test(line)) return 'text-red-400';
    if (/\bSUCCESS\b/i.test(line) || /Finished:\s*SUCCESS/i.test(line)) return 'text-green-400';
    if (/\[Pipeline\]\s*stage/i.test(line)) return 'text-blue-400';
    if (/skipped\s+due\s+to\s+earlier\s+failure/i.test(line) || /\bSKIPPED\b/i.test(line)) return 'text-orange-400';
    return 'text-gray-300';
  };

  return (
    <div className="bg-gray-900 p-3 rounded overflow-auto max-h-[600px]">
      <div className="font-mono text-xs whitespace-pre">
        {lines.length === 0 ? (
          <span className="text-gray-400">—</span>
        ) : (
          lines.map((line, i) => (
            <div key={i} className={getColor(line)}>{line || ' '}</div>
          ))
        )}
      </div>
    </div>
  );
}
