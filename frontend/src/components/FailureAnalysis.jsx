import { useEffect, useRef, useState } from 'react';
import { getRawLogs, getPipelineAnalysis } from '../services/api.js';
import { requestLogStream, subscribeLogs } from '../services/socket.js';
import { useAnalysisStatusQuery } from '../services/queries.js';

const DEFAULT_TABS = [
  'Human Summary',
  'Suggested Fix',
  'Technical Recommendation',
  'Raw Logs',
];

/* -------------------- Progress Bar -------------------- */
function ProgressBar({ step }) {
  const percent = mapStepToPercent(step);
  const label = mapStepToLabel(step);

  return (
    <div className="mt-3">
      <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
        <div
          className="bg-blue-600 h-2 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="text-xs text-gray-600 mt-1 flex justify-between">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
    </div>
  );
}

function mapStepToPercent(step) {
  switch (step) {
    case 'WAITING_FOR_BUILD':
      return 10;
    case 'WAITING_FOR_LOGS':
      return 20;
    case 'FETCHING_LOGS':
      return 20;
    case 'CLEANING_LOGS':
      return 40;
    case 'FILTERING_ERRORS':
      return 40;
    case 'AI_ANALYZING':
      return 60;
    case 'STORING_RESULTS':
      return 80;
    case 'COMPLETED':
      return 100;
    default:
      return 0;
  }
}

function mapStepToLabel(step) {
  switch (step) {
    case 'WAITING_FOR_BUILD':
      return 'Waiting for pipeline to finish';
    case 'WAITING_FOR_LOGS':
      return 'Waiting for final logs';
    case 'FETCHING_LOGS':
      return 'Fetching logs';
    case 'CLEANING_LOGS':
      return 'Cleaning logs';
    case 'FILTERING_ERRORS':
      return 'Filtering errors';
    case 'AI_ANALYZING':
      return 'AI analyzing';
    case 'STORING_RESULTS':
      return 'Storing results';
    case 'COMPLETED':
      return 'Completed';
    default:
      return 'Idle';
  }
}

/* -------------------- Main Component -------------------- */
export default function FailureAnalysis({ run }) {
  const [tab, setTab] = useState('Human Summary');
  const [logs, setLogs] = useState(null);
  const [localStatus, setLocalStatus] = useState(null);
  const [analysisState, setAnalysisState] = useState(null);
  const analysis = analysisState || run?.analysis || run || {};
  const buildNumber = run?.buildNumber;
  const status = run?.analysisStatus;
  const buildRunning = run?.buildStatus === 'BUILDING';
  const { data: analysisStatusFromQuery } = useAnalysisStatusQuery(buildNumber);
  const stepFromQuery = typeof analysisStatusFromQuery === 'object' ? analysisStatusFromQuery?.status : analysisStatusFromQuery;
  const finalResultPresent = typeof analysisStatusFromQuery === 'object' ? (analysisStatusFromQuery?.finalResult != null) : (run?.finalResult != null);
  const resultReady = Boolean(finalResultPresent || analysisState);

  const aiSkipped =
    run?.status === 'SUCCESS' ||
    analysis?.skipped === true ||
    run?.aiAnalysis?.skipped === true;

  const tabs = aiSkipped ? ['Raw Logs'] : DEFAULT_TABS;

  /* Auto tab switch */
  useEffect(() => {
    if (aiSkipped) {
      setTab('Raw Logs');
      return;
    }
    if (status === 'COMPLETED') {
      setTab('Human Summary');
    }
  }, [status, aiSkipped]);

  /* Init logs if already present */
  useEffect(() => {
    setLogs(run?.logs ?? null);
  }, [buildNumber, run?.logs]);

  /* Fetch analysis once when status becomes COMPLETED */
  useEffect(() => {
    if (status !== 'COMPLETED') return;
    if (!buildNumber) return;
    // Avoid refetch if already loaded
    if (analysisState) return;
    (async () => {
      try {
        const data = await getPipelineAnalysis(buildNumber);
        setAnalysisState(data || null);
        setLocalStatus('COMPLETED');
      } catch (err) {
        console.error('Failed to load analysis', err);
      }
    })();
  }, [status, buildNumber]);

  /* Also fetch when React Query-derived status reports COMPLETED */
  useEffect(() => {
    if (stepFromQuery !== 'COMPLETED') return;
    if (!buildNumber) return;
    if (analysisState) return;
    (async () => {
      try {
        const data = await getPipelineAnalysis(buildNumber);
        setAnalysisState(data || null);
        setLocalStatus('COMPLETED');
      } catch (err) {
        console.error('Failed to load analysis (query status)', err);
      }
    })();
  }, [stepFromQuery, buildNumber]);

  /* Reset local analysis when switching builds */
  useEffect(() => {
    setAnalysisState(null);
    setLocalStatus(null);
  }, [buildNumber]);

  // Progress bar driven only by analysis status from React Query

  return (
    <div className="p-4 bg-white rounded shadow mt-4">
      <div className="font-semibold mb-3">Failure Analysis</div>

      {status === 'NOT_REQUIRED' && (
        <div className="mb-3 rounded border border-green-300 bg-green-50 text-green-800 px-3 py-2 text-sm">
          ✅ Pipeline successful — no analysis required
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 rounded text-sm ${
              tab === t
                ? 'bg-neutral text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ---------------- HUMAN SUMMARY ---------------- */}
      {!aiSkipped && tab === 'Human Summary' && (
        <SectionWrapper
          title="Human Summary"
          buildRunning={buildRunning}
          status={localStatus || status}
          step={stepFromQuery || status}
          resultReady={resultReady}
        >
          <>
            {analysis.humanSummary?.overview && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {analysis.humanSummary.overview}
              </p>
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
          </>
        </SectionWrapper>
      )}

      {/* ---------------- SUGGESTED FIX ---------------- */}
      {!aiSkipped && tab === 'Suggested Fix' && (
        <SectionWrapper
          title="Suggested Fix"
          buildRunning={buildRunning}
          status={localStatus || status}
          step={stepFromQuery || status}
          resultReady={resultReady}
        >
          <>
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
          </>
        </SectionWrapper>
      )}

      {/* ---------------- TECHNICAL RECOMMENDATION ---------------- */}
      {!aiSkipped && tab === 'Technical Recommendation' && (
        <SectionWrapper
          title="Technical Recommendation"
          buildRunning={buildRunning}
          status={localStatus || status}
          step={stepFromQuery || status}
          resultReady={resultReady}
          dark
        >
          <>
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
          </>
        </SectionWrapper>
      )}

      {/* ---------------- RAW LOGS ---------------- */}
      {tab === 'Raw Logs' && (
        <RawLogs
          buildNumber={buildNumber}
          logs={logs}
          setLogs={setLogs}
          finalized={Boolean(run?.logsFinal) || run?.buildStatus === 'COMPLETED'}
        />
      )}
    </div>
  );
}

/* -------------------- Section Wrapper -------------------- */
function SectionWrapper({ title, buildRunning, status, step, resultReady, children, dark }) {
  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>

      {buildRunning && (
        <div className="rounded border border-blue-300 bg-blue-50 text-blue-800 px-3 py-2 text-sm">
          ⏳ Pipeline running… waiting for final logs
        </div>
      )}

      {!buildRunning && status === 'WAITING_FOR_BUILD' && (
        <div className="rounded border border-blue-300 bg-blue-50 text-blue-800 px-3 py-2 text-sm">
          ⏳ Waiting for pipeline to finish
        </div>
      )}

      {/* Show progress whenever analysis is not completed OR result is not yet ready */}
      {!buildRunning && step && (step !== 'FAILED') && ((step !== 'COMPLETED') || !resultReady) && (
        <div>
          <p className="text-sm text-gray-600">
            {step === 'STORING_RESULTS' || (step === 'COMPLETED' && !resultReady) ? 'Finalizing analysis…' : 'Analyzing logs…'}
          </p>
          <ProgressBar step={step} />
        </div>
      )}

      {/* Render results when data is ready (even if status label isn't updated yet) */}
      {!buildRunning && resultReady && children}
      {!buildRunning && status === 'FAILED' && children}
    </div>
  );
}

/* -------------------- RAW LOGS -------------------- */
function RawLogs({ buildNumber, logs, setLogs, finalized }) {
  const [lines, setLines] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [finalizedState, setFinalizedState] = useState(Boolean(finalized));
  const containerRef = useRef(null);

  useEffect(() => {
    if (!buildNumber) return;

    setStreaming(true);

    const unsubscribe = subscribeLogs(buildNumber, {
      onAppend: (chunk) => {
        setLogs((prev) => (prev ? prev + chunk : chunk));
      },
      onComplete: () => {
        setStreaming(false);
        setFinalizedState(true);
      },
      onFinal: (payload) => {
        // Replace with authoritative final logs and stop streaming
        setLogs(String(payload?.logs || ''));
        setStreaming(false);
        setFinalizedState(true);
      },
    });

    return () => unsubscribe();
  }, [buildNumber]);

  useEffect(() => {
    setLines(String(logs || '').split(/\r?\n/));
  }, [logs]);

  useEffect(() => {
    setFinalizedState(Boolean(finalized));
  }, [finalized]);

  useEffect(() => {
    if (streaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, streaming]);

  const colorize = (line) => {
    if (/ERROR|FAILURE|FAILED/i.test(line)) return 'text-red-400';
    if (/SUCCESS/i.test(line)) return 'text-green-400';
    if (/\[Pipeline\]\s*stage/i.test(line)) return 'text-blue-400';
    return 'text-gray-300';
  };

  return (
    <div
      ref={containerRef}
      className="bg-gray-900 p-3 rounded max-h-[600px] overflow-auto"
    >
      {streaming && !finalizedState && (
        <div className="text-xs text-blue-300 mb-2">
          Streaming logs…
        </div>
      )}
      {finalizedState && (
        <div className="text-xs text-green-300 mb-2">
          Logs finalized
        </div>
      )}
      <div className="font-mono text-xs whitespace-pre">
        {lines.length === 0 ? (
          <span className="text-gray-500">No logs available.</span>
        ) : (
          lines.map((line, i) => (
            <div key={i} className={colorize(line)}>
              {line || ' '}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
