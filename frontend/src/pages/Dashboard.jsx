import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, PlugZap, Loader2 } from 'lucide-react';
import FailureAnalysis from '../components/FailureAnalysis.jsx';
import { getLatestPipeline, getPipelineHistory, getDashboardMetrics, getAnalysisStatus } from '../services/api.js';
import MetricCard from '../components/MetricCard.jsx';
import PipelineTable from '../components/PipelineTable.jsx';
import PipelineFlow from '../components/PipelineFlow.jsx';
import FailureList from '../components/FailureList.jsx';
import AIEngineCard from '../components/AIEngineCard.jsx';
import PipelineProcessingSteps from '../components/PipelineProcessingSteps.jsx';
import AnalysisStatusBar from '../components/AnalysisStatusBar.jsx';
import { subscribeBuilds, subscribeAnalysis } from '../services/socket.js';
import { useJenkinsStatus } from '../context/JenkinsStatusContext.jsx';
import { testJenkinsConnection } from '../services/settingsService.js';

export default function Dashboard({ mode }) {
  const [buildData, setBuildData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const eventSourceRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [analysisState, setAnalysisState] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const prevStageRef = useRef(null);
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const { isConnected, warning, refresh } = useJenkinsStatus();
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const buildRef = useRef(null);

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

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  const terminalTimerRef = useRef(null);

  useEffect(() => {
    buildRef.current = buildData;
  }, [buildData]);

  const fetchAnalysisStatus = useCallback(async (jobName, buildNumber, pipelineStatus) => {
    if (!jobName || !buildNumber) {
      setAnalysisState(null);
      return;
    }
    if (pipelineStatus && String(pipelineStatus).toUpperCase() === 'SUCCESS') {
      setAnalysisState({ stage: 'skipped', skipped: true });
      return;
    }
    try {
      setAnalysisLoading(true);
      const res = await getAnalysisStatus(jobName, buildNumber);
      const incomingStageRaw = (res?.stage || res?.status || 'fetch_logs').toLowerCase();
      const order = { fetch_logs: 1, filter_errors: 2, ai_analysis: 3, store_results: 4, completed: 5, skipped: 5 };
      const incomingStage = order[incomingStageRaw] ? incomingStageRaw : 'fetch_logs';
      const isSkipped = res?.skipped || incomingStage === 'skipped';
      const prevStage = prevStageRef.current;
      const nextStage = !prevStage || order[incomingStage] >= order[prevStage] ? incomingStage : prevStage;
      prevStageRef.current = nextStage;
      setAnalysisState((prev) => ({ ...(prev || {}), stage: nextStage, skipped: isSkipped }));
      console.log('analysis stage:', nextStage, 'skipped:', isSkipped);
    } catch (e) {
      console.warn('Failed to fetch analysis status', e?.message || e);
      setAnalysisState(null);
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  // When build number changes, reset stage tracking and refetch analysis
  useEffect(() => {
    const job = buildData?.jobName;
    const build = buildData?.buildNumber;
    prevStageRef.current = null;
    if (job && build) {
      fetchAnalysisStatus(job, build, buildData?.status);
    } else {
      setAnalysisState(null);
    }
  }, [buildData?.jobName, buildData?.buildNumber, buildData?.status, fetchAnalysisStatus]);

  const syncLatestPipeline = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/pipeline/latest?_ts=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      const payload = data?.data ?? data;
      if (payload === null || payload === undefined || (data?.success === false && data?.data === null)) {
        setBuildData(null);
        setLoading(false);
        setError('');
        return;
      }
      fetchAnalysisStatus(payload.jobName, payload.buildNumber, payload.status);
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
    }
  }, [apiBase, fetchAnalysisStatus]);

  // Initial fetch to avoid stale UI on first render
  useEffect(() => {
    syncLatestPipeline();
    const job = buildRef.current?.jobName;
    const build = buildRef.current?.buildNumber;
    if (job && build) fetchAnalysisStatus(job, build, buildRef.current?.status);
  }, [syncLatestPipeline, fetchAnalysisStatus]);

  // Polling fallback to keep UI fresh if SSE stalls
  useEffect(() => {
    if (!connected) return undefined;
    const interval = setInterval(() => {
      syncLatestPipeline();
      const job = buildRef.current?.jobName;
      const build = buildRef.current?.buildNumber;
      if (job && build) fetchAnalysisStatus(job, build, buildRef.current?.status);
    }, 3000);
    return () => clearInterval(interval);
  }, [connected, syncLatestPipeline, fetchAnalysisStatus]);

  // Force terminal rendering to avoid stuck spinner after completion
  useEffect(() => {
    if (terminalTimerRef.current) {
      clearTimeout(terminalTimerRef.current);
      terminalTimerRef.current = null;
    }
    if (analysisState?.stage && ['completed', 'skipped'].includes(String(analysisState.stage).toLowerCase())) {
      terminalTimerRef.current = setTimeout(() => {
        setAnalysisState((prev) => prev ? { ...prev, stage: prev.stage, skipped: prev.skipped } : prev);
      }, 2000);
    }
    return () => {
      if (terminalTimerRef.current) {
        clearTimeout(terminalTimerRef.current);
        terminalTimerRef.current = null;
      }
    };
  }, [analysisState]);

  useEffect(() => {
    if (!connected) {
      setBuildData(null);
      setLoading(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return undefined;
    }

    syncLatestPipeline();

    if (eventSourceRef.current) return undefined;

    const es = new EventSource(`${apiBase.replace(/\/$/, '')}/events/pipeline-stream`);
    eventSourceRef.current = es;

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data || '{}');
        const eventType = data?.type;
        const isPipelineEvent = eventType === 'pipeline_update';
        const isAnalysisEvent = ['analysis_update', 'analysis_complete', 'analysis_completed'].includes(eventType);
        if (isPipelineEvent) {
          syncLatestPipeline();
        }
        if (isPipelineEvent || isAnalysisEvent) {
          const job = data?.jobName || buildRef.current?.jobName;
          const build = data?.buildNumber || buildRef.current?.buildNumber;
          if (job && build) fetchAnalysisStatus(job, build, data?.status);
        }
      } catch {}
    };

    es.onerror = () => {
      console.warn('SSE connection lost; retrying...');
      es.close();
      eventSourceRef.current = null;
      setTimeout(() => {
        if (connected && !eventSourceRef.current) {
          const retry = new EventSource(`${apiBase.replace(/\/$/, '')}/events/pipeline-stream`);
          eventSourceRef.current = retry;
          retry.onmessage = es.onmessage;
          retry.onerror = es.onerror;
        }
      }, 2000);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [connected, apiBase, syncLatestPipeline, fetchAnalysisStatus]);

  // Dashboard metrics: fetch on mount, refresh every 20s, and on live events
  useEffect(() => {
    if (!connected) {
      setMetrics(null);
      setMetricsLoading(false);
      return undefined;
    }

    let intervalId = null;
    let mounted = true;
    setMetricsLoading(true);

    const refreshMetrics = async () => {
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
      }
    };
    // Initial
    refreshMetrics();
    // Poll every 20s
    intervalId = setInterval(refreshMetrics, 20000);

    // Subscribe to build lifecycle and analysis completion to trigger refresh
    const unsubBuilds = subscribeBuilds({
      onNew: () => refreshMetrics(),
      onStarted: () => refreshMetrics(),
      onCompleted: () => refreshMetrics(),
    });
    const unsubAnalysis = subscribeAnalysis({
      onCompleted: () => refreshMetrics(),
      onProgress: () => {},
    });

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      unsubBuilds();
      unsubAnalysis();
    };
  }, [connected]);

  // Load history once and keep live updates via sockets
  useEffect(() => {
    if (!connected) {
      setHistory([]);
      return undefined;
    }

    let mounted = true;
    (async () => {
      try {
        const runs = await getPipelineHistory('all');
        if (!mounted) return;
        setHistory(Array.isArray(runs) ? runs : []);
      } catch (_) {}
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
        setHistory((prev) => prev.map((r) => (
          r.buildNumber === payload?.buildNumber ? { ...r, status: payload?.status || 'UNKNOWN' } : r
        )));
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

  // Helper to format values safely
  const metricsUnavailable = disconnected;
  const metricsLoadingState = metricsLoading || connectionLoading;
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
                {testingConnection && <Loader2 className="w-4 h-4 animate-spin" />}
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
        <MetricCard title="Total Pipelines" value={valTotal} color="indigo" icon="chart-line" loading={metricsLoadingState} series={[0.2,0.35,0.32,0.4,0.38,0.42]} />
        <MetricCard title="Active Builds" value={valActive} color="cyan" icon="activity" loading={metricsLoadingState} series={[0.1,0.2,0.18,0.25,0.22,0.3]} />
        <MetricCard title="Failed Today" value={valFailed} color="red" icon="alert" loading={metricsLoadingState} series={[0.3,0.28,0.25,0.22,0.2,0.18]} />
        <MetricCard title="Avg Fix Time" value={valFixTime} color="emerald" icon="clock" loading={metricsLoadingState} series={[0.5,0.48,0.45,0.42,0.4,0.38]} />
        <MetricCard title="AI Accuracy" value={valAccuracy} color="violet" icon="brain" loading={metricsLoadingState} series={[0.6,0.62,0.64,0.66,0.68,0.7]} />
      </div>

      {/* Live Pipeline Table */}
      <div className="space-y-2">
        <PipelineTable
          rows={connected ? history.slice(0, 6) : []}
          emptyMessage={disconnected ? 'No pipelines available. Connect Jenkins to fetch pipeline data.' : (connectionLoading ? 'Checking Jenkins connection…' : 'No pipelines yet.')}
        />
        {connected && (
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              {buildData && (
                <div className="card-surface mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold">{buildData.jobName || 'Pipeline'}</div>
                      <div className="text-xs text-gray-400">Build #{buildData.buildNumber} • {lastUpdatedLabel || '—'}</div>
                    </div>
                    <div className="text-xs text-gray-400">Status: {buildData.status || 'UNKNOWN'}</div>
                  </div>
                </div>
              )}
              {buildData && (
                <AnalysisStatusBar stage={analysisState?.stage} skipped={analysisState?.skipped} className="mb-3" />
              )}
              <div className="flex flex-col gap-2">
                {buildData?.progress && buildData.progress !== 'FAILED' && (
                  <PipelineProcessingSteps step={buildData.progress} pipelineStatus={buildData?.status} />
                )}
                <div className="-mt-1">
                  <PipelineFlow currentBuildNumber={buildData?.buildNumber} />
                </div>
              </div>
            </div>
            <FailureList failures={history.filter((r) => ['FAILURE','FAILED'].includes(String(r.status||'').toUpperCase()))} />
          </div>

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
