import { useEffect, useRef, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { getRawLogs, getPipelineAnalysis } from '../services/api.js';
import { requestLogStream, subscribeLogs } from '../services/socket.js';
import { useAnalysisStatusQuery } from '../services/queries.js';
import PipelineGraph from './PipelineGraph';

const DEFAULT_TABS = [
  'Human Summary',
  'Suggested Fix',
  'Technical Recommendation',
  'Raw Logs',
];

/* -------------------- Progress Bar (Amazon-style Stepper) -------------------- */
export function ProgressBar({ step }) {
  // UI-only configuration (do not modify status values)
  const STEPS = [
    { key: 'FETCHING_LOGS', label: 'Fetching Logs' },
    { key: 'FILTERING_ERRORS', label: 'Filtering Errors' },
    { key: 'AI_ANALYZING', label: 'AI Analyzing' },
    { key: 'STORING_RESULTS', label: 'Storing Results' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  // Determine active index from provided status; default to first when in waiting/unknown
  let currentIndex = STEPS.findIndex((s) => s.key === step);
  if (currentIndex === -1) {
    // Treat pre-analysis or unknown states as the first step (UI-only)
    currentIndex = 0;
  }
  const completedAll = step === 'COMPLETED' || currentIndex === STEPS.length - 1;

  // Progress width for smooth animated line
  const progressPct = (() => {
    const total = STEPS.length - 1;
    if (total <= 0) return 100;
    const idx = completedAll ? total : Math.max(0, Math.min(currentIndex, total));
    return Math.round((idx / total) * 100);
  })();

  return (
    <div className="mt-6 mb-6 select-none flex justify-center">
      {/* Modern horizontal centered stepper */}
      <div className="relative w-full max-w-3xl px-2 sm:px-4">
        {/* Base track */}
        <div
          className="absolute left-3 right-3 top-3 sm:top-4 h-[2px] rounded"
          style={{ backgroundColor: 'var(--border-color)' }}
          aria-hidden
        />
        {/* Progress fill (animated) */}
        <div
          className="absolute left-3 top-3 sm:top-4 h-[2px] rounded transition-all duration-500 ease-out"
          style={{ width: `calc(${progressPct}% - 12px)`, backgroundColor: 'var(--accent)' }}
          aria-hidden
        />
        {/* Steps */}
        <div className="flex items-center justify-between w-full">
          {STEPS.map((s, idx) => {
            const isCompleted = completedAll ? idx <= currentIndex : idx < currentIndex;
            const isActive = (idx === currentIndex) && (step === 'COMPLETED' || !completedAll);
            return (
              <div key={s.key} className="flex flex-col items-center text-center">
                <div
                  className={[
                    'flex items-center justify-center rounded-full border shadow-sm',
                    'transition-all duration-300',
                    isCompleted ? 'text-white' : 'text-gray-400',
                    isActive ? 'ring-4 ring-offset-2' : '',
                  ].join(' ')}
                  style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: isCompleted ? 'var(--accent)' : 'var(--bg-primary)',
                    borderColor: isActive || isCompleted ? 'var(--accent)' : 'var(--border-color)',
                    boxShadow: isActive ? '0 0 0 4px rgba(0,0,0,0.02), 0 0 0 0 var(--accent)' : undefined,
                  }}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={s.label}
                  title={s.label}
                >
                  {isCompleted ? '✓' : ''}
                </div>
                <div
                  className="text-[11px] mt-2 whitespace-nowrap"
                  style={{ color: isCompleted || isActive ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
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
  const prevStepRef = useRef(null);
  const [visualStep, setVisualStep] = useState(stepFromQuery || status);
  const pipelineSuccess = String(run?.status || '').toUpperCase() === 'SUCCESS';

  // Determine historical executions: completed pipeline or completed analysis
  const pipelineCompleted = run?.status === 'SUCCESS' || run?.status === 'FAILURE' || run?.status === 'FAILED' || run?.buildStatus === 'COMPLETED';
  const analysisCompleted = (localStatus || status) === 'COMPLETED' || stepFromQuery === 'COMPLETED';
  const isHistorical = Boolean(pipelineCompleted || analysisCompleted);

  const aiSkipped =
    run?.status === 'SUCCESS' ||
    analysis?.skipped === true ||
    run?.aiAnalysis?.skipped === true;

  const timelineAvailable = Array.isArray(run?.stages) && run.stages.length > 0;
  const tabs = aiSkipped ? ['Raw Logs'] : [...DEFAULT_TABS, ...(timelineAvailable ? ['Timeline'] : [])];

  // NEVER auto-switch tabs; keep default on analysis. Users choose manually.

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
    setVisualStep(stepFromQuery || status || null);
  }, [buildNumber]);

  /* Visual step with failsafe: if backend jumps AI_ANALYZING -> COMPLETED, simulate STORING_RESULTS for 1s */
  useEffect(() => {
    const incoming = stepFromQuery || status || null;
    const prev = prevStepRef.current;
    prevStepRef.current = incoming;
    if (!incoming) return;
    if (incoming === 'COMPLETED' && prev && prev !== 'STORING_RESULTS') {
      // Simulate 'STORING_RESULTS' briefly for UX continuity
      setVisualStep('STORING_RESULTS');
      const t = setTimeout(() => setVisualStep('COMPLETED'), 1000);
      return () => clearTimeout(t);
    }
    setVisualStep(incoming);
  }, [stepFromQuery, status]);

  // Progress bar driven only by analysis status from React Query

  return (
    <div className="p-4 bg-white rounded shadow mt-4">
      <div className="font-semibold mb-3">Failure Analysis</div>

      {pipelineSuccess && (
        <div className="mb-4 flex items-start gap-3">
          <CheckCircle className="text-green-400 w-5 h-5 mt-1" />
          <div className="space-y-1">
            <p className="font-medium">Pipeline Healthy</p>
            <p className="text-sm text-slate-400">
              This pipeline executed successfully. AI analysis was not required.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 rounded text-sm transition-all duration-200 ease-in-out ${
              tab === t
                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                : 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Stepper rendered at page level (after build info) */}

      {/* ---------------- HUMAN SUMMARY ---------------- */}
      {!aiSkipped && tab === 'Human Summary' && (
        <SectionWrapper
          title="Human Summary"
          buildRunning={buildRunning}
          status={localStatus || status}
          step={visualStep}
          resultReady={resultReady}
          isHistorical={isHistorical}
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
          step={visualStep}
          resultReady={resultReady}
          isHistorical={isHistorical}
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
          step={visualStep}
          resultReady={resultReady}
          dark
          isHistorical={isHistorical}
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

      {tab === 'Timeline' && timelineAvailable && (
        <div className="mt-2">
          {/* Use existing pipeline graph as execution timeline */}
          {/* Keeps layout consistent and avoids demo hacks */}
          <PipelineGraph run={run} />
        </div>
      )}
    </div>
  );
}

/* -------------------- Section Wrapper -------------------- */
function SectionWrapper({ title, buildRunning, status, step, resultReady, children, dark, isHistorical }) {
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

      {/* Stepper rendered globally above — keep section content clean */}

      {/* Render results immediately once available; do not auto-switch tabs */}
      {!buildRunning && (isHistorical || resultReady || status === 'FAILED') && children}
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
    // If logs already exist or finalized, render immediately without streaming
    const existing = String(logs || '').length > 0;
    if (finalizedState || existing) {
      setStreaming(false);
      return;
    }
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
  }, [buildNumber, finalizedState]);

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
      className="log-viewer p-3 rounded max-h-[600px] overflow-auto"
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
          <span className="text-gray-500">No logs available for this execution.</span>
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
