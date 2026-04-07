import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, PlugZap } from 'lucide-react';
import FailureAnalysis from '../components/FailureAnalysis';
import { getLatestPipeline, getPipelineHistory, getDashboardMetrics } from '../services/api.js';
import MetricCard from '../components/MetricCard';
import PipelineTable from '../components/PipelineTable';
import PipelineFlow from '../components/PipelineFlow';
import FailureList from '../components/FailureList';
import AIEngineCard from '../components/AIEngineCard';
import AnalysisStatusBar from '../components/AnalysisStatusBar';
import { subscribeBuilds, subscribeAnalysis } from '../services/socket.js';
import { useJenkinsStatus } from '../context/JenkinsStatusContext';
import { testJenkinsConnection } from '../services/settingsService.js';
import DashboardCardSkeleton from '../components/skeletons/DashboardCardSkeleton';
import PipelineListSkeleton from '../components/skeletons/PipelineListSkeleton';
import FailureListSkeleton from '../components/skeletons/FailureListSkeleton';
import Skeleton from '../components/ui/Skeleton';

const ANALYSIS_STAGE_ORDER = {
  fetch_logs: 1,
  filter_errors: 2,
  ai_analysis: 3,
  store_results: 4,
  completed: 5,
  skipped: 5,
};

const ANALYSIS_STAGE_ALIASES = {
  waiting_for_build: 'fetch_logs',
  waiting_for_logs: 'fetch_logs',
  fetching_logs: 'fetch_logs',
  fetch_logs: 'fetch_logs',
  filtering_errors: 'filter_errors',
  filter_errors: 'filter_errors',
  ai_analyzing: 'ai_analysis',
  ai_analysis: 'ai_analysis',
  store_results: 'store_results',
  storing_results: 'store_results',
  completed: 'completed',
  skipped: 'skipped',
  not_required: 'skipped',
};

function normalizeAnalysisStage(progressValue, pipelineStatus) {
  if (String(pipelineStatus || '').toUpperCase() === 'SUCCESS') {
    return 'skipped';
  }
  const raw = String(progressValue || '').trim().toLowerCase();
  if (!raw) return null;
  return ANALYSIS_STAGE_ALIASES[raw] || null;
}

export default function Dashboard({ mode }) {
  const [buildData, setBuildData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [analysisState, setAnalysisState] = useState(null);
  const prevStageRef = useRef(null);
  const prevBuildNumberRef = useRef(null);
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const { isConnected, warning, refresh } = useJenkinsStatus();
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const syncInFlightRef = useRef(false);
  const syncQueuedRef = useRef(false);
  const syncTimerRef = useRef(null);
  const lastSyncAtRef = useRef(0);
  const metricsInFlightRef = useRef(false);
  const lastMetricsFetchAtRef = useRef(0);

  const connectionLoading = isConnected === null;
  const disconnected = isConnected === false || warning;
  const connected = isConnected === true && !warning;

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testJenkinsConnection();
      setTestResult({ status: 'success', message: res?.message || 'Jenkins connection successful.' });
      refresh();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Unable to reach Jenkins server.';
      setTestResult({ status: 'error', message });
    } finally {
      setTestingConnection(false);
    }
  };

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const buildNumber = Number(buildData?.buildNumber);
    const hasValidBuild = Number.isFinite(buildNumber) && buildNumber > 0;
    const progressRaw = buildData?.progress ?? buildData?.analysisStatus ?? buildData?.analysisStep;
    const nextStage = normalizeAnalysisStage(progressRaw, buildData?.status);

    if (!hasValidBuild) {
      prevBuildNumberRef.current = null;
      prevStageRef.current = null;
      setAnalysisState(nextStage ? { stage: nextStage, skipped: nextStage === 'skipped' } : null);
      return;
    }

    const buildChanged = prevBuildNumberRef.current !== buildNumber;
    if (buildChanged) {
      // New build detected: clear previous build's monotonic stage memory.
      prevStageRef.current = null;
    }
    prevBuildNumberRef.current = buildNumber;

    if (!nextStage) {
      prevStageRef.current = null;
      setAnalysisState(nextStage ? { stage: nextStage, skipped: nextStage === 'skipped' } : null);
      return;
    }

    const previousStage = prevStageRef.current;
    const resolvedStage = !previousStage || ANALYSIS_STAGE_ORDER[nextStage] >= ANALYSIS_STAGE_ORDER[previousStage]
      ? nextStage
      : previousStage;

    prevStageRef.current = resolvedStage;
    setAnalysisState({ stage: resolvedStage, skipped: resolvedStage === 'skipped' });
  }, [buildData?.buildNumber, buildData?.progress, buildData?.analysisStatus, buildData?.analysisStep, buildData?.status]);

  const syncLatestPipeline = useCallback(async ({ force = false } = {}) => {
    if (!connected) return;

    const now = Date.now();
    const minSyncGapMs = 1200;
    if (!force && now - lastSyncAtRef.current < minSyncGapMs) {
      return;
    }

    if (syncInFlightRef.current) {
      syncQueuedRef.current = true;
      return;
    }

    syncInFlightRef.current = true;
    lastSyncAtRef.current = now;

    try {
      const data = await getLatestPipeline();
      const payload = data?.data ?? data;

      if (payload === null || payload === undefined || (data?.success === false && data?.data === null)) {
        setBuildData(null);
        setLoading(false);
        setError('');
        return;
      }

      const getStagesSignature = (val) => {
        if (!Array.isArray(val?.stages)) return '';
        return val.stages.map((stage) => `${stage?.name || ''}:${stage?.status || ''}`).join('|');
      };

      const progress = payload?.progress ?? payload?.analysisStatus ?? payload?.analysisStep ?? null;
      const normalized = { ...(payload || {}), progress };

      setBuildData((prev) => {
        if (!prev) {
          setLoading(false);
          setError('');
          return normalized;
        }

        const prevStages = getStagesSignature(prev);
        const nextStages = getStagesSignature(normalized);
        if (
          prev.buildNumber !== normalized.buildNumber ||
          prev.progress !== normalized.progress ||
          prev.analysisStatus !== normalized.analysisStatus ||
          prev.status !== normalized.status ||
          prev.logsFinal !== normalized.logsFinal ||
          prevStages !== nextStages
        ) {
          setError('');
          return normalized;
        }

        return prev;
      });
    } catch (e) {
      console.error('Pipeline refresh failed', e);
      setError('Failed to load latest');
      setLoading(false);
    } finally {
      syncInFlightRef.current = false;

      if (syncQueuedRef.current) {
        syncQueuedRef.current = false;
        if (syncTimerRef.current) {
          clearTimeout(syncTimerRef.current);
        }
        syncTimerRef.current = setTimeout(() => {
          syncLatestPipeline({ force: true });
        }, 900);
      }
    }
  }, [connected]);

  useEffect(() => {
    if (!connected) {
      setBuildData(null);
      setLoading(false);
      return undefined;
    }

    syncLatestPipeline({ force: true });

    const intervalId = setInterval(() => {
      syncLatestPipeline();
    }, 8000);

    const unsubBuilds = subscribeBuilds({
      onNew: () => syncLatestPipeline(),
      onStarted: () => syncLatestPipeline(),
      onCompleted: () => syncLatestPipeline({ force: true }),
    });
    const unsubAnalysis = subscribeAnalysis({
      onProgress: () => syncLatestPipeline(),
      onCompleted: () => syncLatestPipeline({ force: true }),
      onSkipped: () => syncLatestPipeline({ force: true }),
    });

    return () => {
      clearInterval(intervalId);
      unsubBuilds();
      unsubAnalysis();
    };
  }, [connected, syncLatestPipeline]);

  // Dashboard metrics: fetch on mount, refresh every 30s, and debounce event-triggered refreshes
  useEffect(() => {
    if (!connected) {
      setMetrics(null);
      setMetricsLoading(false);
      return undefined;
    }

    let intervalId = null;
    let debounceTimerId = null;
    let mounted = true;
    setMetricsLoading(true);

    const refreshMetrics = async ({ force = false } = {}) => {
      const now = Date.now();
      const minGapMs = 10000;
      if (!force && now - lastMetricsFetchAtRef.current < minGapMs) {
        return;
      }
      if (metricsInFlightRef.current) {
        return;
      }

      metricsInFlightRef.current = true;
      lastMetricsFetchAtRef.current = now;
      try {
        const m = await getDashboardMetrics();
        if (!mounted) return;
        if (m && typeof m === 'object') {
          setMetrics(m);
        } else {
          setMetrics(null);
        }
        setMetricsLoading(false);
      } catch (_) {
        if (!mounted) return;
        setMetrics(null);
        setMetricsLoading(false);
      } finally {
        metricsInFlightRef.current = false;
      }
    };

    const requestMetricsRefresh = () => {
      if (debounceTimerId) return;
      debounceTimerId = setTimeout(() => {
        debounceTimerId = null;
        refreshMetrics();
      }, 1200);
    };

    // Initial
    refreshMetrics({ force: true });
    // Poll every 30s
    intervalId = setInterval(() => refreshMetrics({ force: true }), 30000);

    // Subscribe to build lifecycle and analysis completion to trigger debounced refresh
    const unsubBuilds = subscribeBuilds({
      onNew: requestMetricsRefresh,
      onStarted: requestMetricsRefresh,
      onCompleted: requestMetricsRefresh,
    });
    const unsubAnalysis = subscribeAnalysis({
      onCompleted: requestMetricsRefresh,
      onProgress: () => {},
    });

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      if (debounceTimerId) clearTimeout(debounceTimerId);
      unsubBuilds();
      unsubAnalysis();
    };
  }, [connected]);

  // Load history once and keep live updates via sockets
  useEffect(() => {
    if (!connected) {
      setHistory([]);
      setHistoryLoading(false);
      return undefined;
    }

    let mounted = true;
    setHistoryLoading(true);
    (async () => {
      try {
        const runs = await getPipelineHistory('all');
        if (!mounted) return;
        setHistory(Array.isArray(runs) ? runs : []);
      } catch (_) {
        if (!mounted) return;
        setHistory([]);
      } finally {
        if (mounted) setHistoryLoading(false);
      }
    })();
    const unsubBuilds = subscribeBuilds({
      onNew: (payload) => {
        setHistory((prev) => {
          const exists = prev.some((r) => r.buildNumber === payload?.buildNumber);
          if (exists) return prev;
          const item = {
            jobName: payload?.jobName || 'Pipeline',
            buildNumber: payload?.buildNumber,
            status: 'RUNNING',
            executedAt: new Date().toISOString(),
          };
          return [item, ...prev].slice(0, 500);
        });
      },
      onCompleted: (payload) => {
        setHistory((prev) => prev.map((r) => {
          if (r.buildNumber !== payload?.buildNumber) return r;
          const nextStatus = (payload?.status || payload?.result || r.status || 'UNKNOWN').toUpperCase();
          return { ...r, status: nextStatus };
        }));
      },
    });
    const unsubAnalysis = subscribeAnalysis({
      onProgress: (p) => {
        setHistory((prev) => prev.map((r) => (
          r.buildNumber === p?.buildNumber ? { ...r, status: 'FAILED' } : r
        )));
      },
      onCompleted: (p) => {
        setHistory((prev) => prev.map((r) => (
          r.buildNumber === p?.buildNumber ? { ...r, status: 'FAILED' } : r
        )));
      },
    });
    return () => { mounted = false; unsubBuilds(); unsubAnalysis(); };
  }, [connected]);

  // Stepper depends only on backend state via buildData.progress
  const lastUpdatedLabel = useMemo(() => {
    if (!buildData?.executedAt) return null;
    const basis = buildData.executedAt;
    const diff = Math.floor((Date.now() - new Date(basis).getTime()) / 1000);
    return `Last updated: ${diff}s ago`;
  }, [buildData]);

  const flowData = useMemo(() => {
    if (!buildData) return null;
    return {
      buildNumber: buildData?.buildNumber ?? null,
      jobName: buildData?.jobName || '',
      status: buildData?.status || buildData?.buildStatus || 'pending',
      stages: Array.isArray(buildData?.stages) ? buildData.stages : [],
      durationMs: Number.isFinite(buildData?.durationMs)
        ? buildData.durationMs
        : (Number.isFinite(buildData?.durationSeconds) ? Number(buildData.durationSeconds) * 1000 : null),
    };
  }, [buildData]);

  // Helper to format values safely
  const metricsUnavailable = disconnected;
  const metricsLoadingState = metricsLoading || connectionLoading;
  const tableLoading = connectionLoading || (connected && historyLoading);
  const m = metrics || {};
  const valTotal = metricsUnavailable ? '—' : (Number.isFinite(m.totalPipelines) ? m.totalPipelines : 0);
  const valActive = metricsUnavailable ? '—' : (Number.isFinite(m.activeBuilds) ? m.activeBuilds : 0);
  const valFailed = metricsUnavailable ? '—' : (Number.isFinite(m.failedToday) ? m.failedToday : 0);
  const valFixTime = metricsUnavailable ? '—' : (typeof m.avgFixTime === 'number' || typeof m.avgFixTime === 'string' ? m.avgFixTime : '--');
  const valAccuracy = metricsUnavailable ? '—' : (Number.isFinite(m.aiAccuracy) ? `${m.aiAccuracy}%` : '--');

  return (
    <div className="p-6 space-y-6">
      {disconnected && (
        <div className="card-surface border border-amber-500/30 bg-amber-500/10 flex gap-4 items-start">
          <div className="mt-1 text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold text-amber-100">Jenkins Not Connected</div>
              <span className="px-2 py-1 text-xs rounded-full border border-amber-500/40 bg-amber-500/20 text-amber-100">Disconnected</span>
            </div>
            <div className="text-sm text-amber-50/90">Connect your Jenkins server to start monitoring pipelines and analyzing CI/CD failures.</div>
            <div className="flex flex-wrap gap-3">
              <Link to="/settings" className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-semibold shadow hover:brightness-105 transition-colors">Configure Jenkins</Link>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-4 py-2 rounded-lg border border-amber-400/50 text-amber-100 hover:bg-amber-500/10 disabled:opacity-70 inline-flex items-center gap-2"
              >
                {testingConnection && <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />}
                <span>Test Connection</span>
              </button>
              <button
                type="button"
                onClick={refresh}
                className="px-4 py-2 rounded-lg text-sm border border-amber-400/30 text-amber-100 hover:bg-amber-500/10"
              >
                Refresh Status
              </button>
            </div>
            {testResult && (
              <div className={`text-xs px-3 py-2 rounded border ${testResult.status === 'success' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100' : 'border-red-400/40 bg-red-500/10 text-red-100'}`}>
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metrics Row (modern cards with unique gradients and stroke colors) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {metricsLoadingState ? (
          Array.from({ length: 5 }).map((_, idx) => <DashboardCardSkeleton key={idx} />)
        ) : (
          <>
            <MetricCard title="Total Pipelines" value={valTotal} color="indigo" icon="chart-line" loading={false} series={[0.2,0.35,0.32,0.4,0.38,0.42]} />
            <MetricCard title="Active Builds" value={valActive} color="cyan" icon="activity" loading={false} series={[0.1,0.2,0.18,0.25,0.22,0.3]} />
            <MetricCard title="Failed Today" value={valFailed} color="red" icon="alert" loading={false} series={[0.3,0.28,0.25,0.22,0.2,0.18]} />
            <MetricCard title="Avg Fix Time" value={valFixTime} color="emerald" icon="clock" loading={false} series={[0.5,0.48,0.45,0.42,0.4,0.38]} />
            <MetricCard title="AI Accuracy" value={valAccuracy} color="violet" icon="brain" loading={false} series={[0.6,0.62,0.64,0.66,0.68,0.7]} />
          </>
        )}
      </div>

      {/* Live Pipeline Table */}
      <div className="space-y-2">
        {tableLoading ? (
          <PipelineListSkeleton variant="table" rows={6} />
        ) : (
          <PipelineTable
            rows={connected ? history.slice(0, 6) : []}
            emptyMessage={disconnected ? 'No pipelines available. Connect Jenkins to fetch pipeline data.' : 'No pipelines yet.'}
          />
        )}
        {connected && !tableLoading && (
          <div className="flex justify-end">
            <Link to="/pipelines" className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
              View All Pipelines →
            </Link>
          </div>
        )}
      </div>

      {connected ? (
        <>
          {error && (
            <div className="card-surface border border-red-500/30 bg-red-500/10 text-sm text-red-100">
              {error}
            </div>
          )}
          {!loading && !buildData && (
            <div className="card-surface border border-dashed border-slate-500/40 bg-slate-800/40 text-sm text-slate-100">
              No pipeline executions yet.
            </div>
          )}
          {/* Pipeline Flow Visual and Failure List side-by-side */}
          {loading && !buildData ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="card-surface mb-1">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 space-y-3">
                  <Skeleton className="h-4 w-36" />
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={idx} className="rounded-lg border border-gray-200 dark:border-slate-800/70 bg-gray-50 dark:bg-slate-800/50 px-3 py-2 flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <div className="grid grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-2">
                        <Skeleton className="h-14 w-14 rounded-full" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <FailureListSkeleton variant="compact" rows={5} />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                {buildData && (
                  <div className="card-surface mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold">{buildData.jobName || 'Pipeline'}</div>
                        <div className="text-xs text-gray-600 dark:text-slate-400">Build #{buildData.buildNumber} • {lastUpdatedLabel || '—'}</div>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-slate-400">Status: {buildData.status || 'UNKNOWN'}</div>
                    </div>
                  </div>
                )}
                {buildData && (
                  <AnalysisStatusBar stage={analysisState?.stage} skipped={analysisState?.skipped} className="mb-3" />
                )}
                <div className="flex flex-col gap-2">
                  <div className="-mt-1">
                    <PipelineFlow flowData={flowData} />
                  </div>
                </div>
              </div>
              <FailureList
                failures={history.filter((r) => ['FAILURE', 'FAILED'].includes(String(r.status || '').toUpperCase()))}
                loading={historyLoading}
              />
            </div>
          )}

          {/* AI Engine Panel */}
          <AIEngineCard
            stats={{
              analyzedToday: history.filter((r) => r.executedAt && (new Date(r.executedAt).toDateString() === new Date().toDateString())).length,
              avgConfidence: (() => {
                const cs = history.map((r) => typeof r.confidenceScore === 'number' ? r.confidenceScore : null).filter((v) => v != null);
                return cs.length ? cs.reduce((a,b)=>a+b,0)/cs.length : 0;
              })(),
              fixesGenerated: 0,
              modelOnline: true,
            }}
          />

          {/* Failure Analysis remains, driven by SSE/queries */}
          {buildData && <FailureAnalysis run={buildData} />}
        </>
      ) : connectionLoading ? (
        <div className="card-surface border border-[var(--border-color)] text-sm text-gray-400">
          Checking Jenkins connection...
        </div>
      ) : (
        <div className="card-surface border border-dashed border-amber-500/30 bg-amber-500/5 text-sm text-amber-100 flex items-start gap-3">
          <PlugZap className="w-5 h-5 mt-0.5" />
          <div>
            <div className="font-semibold">Live dashboards paused</div>
            <div className="text-amber-100/80">Reconnect Jenkins to see pipelines, flow visualization, and AI insights.</div>
          </div>
        </div>
      )}
    </div>
  );
}
