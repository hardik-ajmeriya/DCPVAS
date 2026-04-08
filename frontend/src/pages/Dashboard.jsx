import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, PlugZap, Loader2 } from 'lucide-react';
import FailureAnalysis from '../components/FailureAnalysis.jsx';
import MetricCard from '../components/MetricCard.jsx';
import PipelineTable from '../components/PipelineTable.jsx';
import PipelineFlow from '../components/PipelineFlow.jsx';
import FailureList from '../components/FailureList.jsx';
import AIEngineCard from '../components/AIEngineCard.jsx';
import PipelineProcessingSteps from '../components/PipelineProcessingSteps.jsx';
import AnalysisStatusBar from '../components/AnalysisStatusBar.jsx';
import CardsSkeleton from '../components/skeletons/CardsSkeleton.jsx';
import PipelineFlowSkeleton from '../components/skeletons/PipelineFlowSkeleton.jsx';
import PipelineListSkeleton from '../components/skeletons/PipelineListSkeleton';
import { useJenkinsStatus } from '../context/JenkinsStatusContext.jsx';
import { testJenkinsConnection } from '../services/settingsService.js';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export default function Dashboard({ mode }) {
  const { isConnected, warning, refresh } = useJenkinsStatus();

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [pipelineState, setPipelineState] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [stateLoading, setStateLoading] = useState(true);
  const [stateError, setStateError] = useState('');
  const eventSourceRef = useRef(null);
  const [sseFailed, setSseFailed] = useState(false);

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

  // Live dashboard via SSE
  useEffect(() => {
    if (!connected) {
      setPipelineState(null);
      setStateLoading(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return undefined;
    }

    if (eventSourceRef.current) return undefined;

    const url = `${apiBase.replace(/\/$/, '')}/events/pipeline-stream`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setSseFailed(false);
    };

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data || '{}');
        console.log('PIPELINE STATE (SSE):', data);
        console.log('AI ANALYSIS (from SSE state):', data?.aiAnalysis);
        setPipelineState(data || null);
        setStateLoading(false);
        setStateError('');
      } catch {
        // ignore malformed payloads
      }
    };

    es.onerror = () => {
      console.warn('SSE connection lost; retrying...');
      es.close();
      eventSourceRef.current = null;
      setSseFailed(true);

      setTimeout(() => {
        if (connected && !eventSourceRef.current) {
          const retry = new EventSource(url);
          eventSourceRef.current = retry;
          retry.onmessage = es.onmessage;
          retry.onerror = es.onerror;
        }
      }, 2000);
    };

    return () => {
      es.close();
    };
  }, [connected]);

  // REST polling fallback when SSE is unavailable
  useEffect(() => {
    if (!connected || !sseFailed) return undefined;

    let mounted = true;
    let intervalId = null;

    const fetchState = async () => {
      try {
        const res = await fetch(`${apiBase}/dashboard/state`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        const data = await res.json();
        console.log('PIPELINE STATE (REST snapshot):', data);
        console.log('AI ANALYSIS (from REST snapshot):', data?.aiAnalysis);
        if (!mounted) return;
        setPipelineState(data || null);
        setStateLoading(false);
        setStateError('');
      } catch (err) {
        if (!mounted) return;
        setStateError('Failed to load dashboard state');
        setStateLoading(false);
      }
    };

    fetchState();
    intervalId = setInterval(fetchState, 5000);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [connected, sseFailed]);

  // Safety guard: avoid infinite loading skeleton if backend never responds
  useEffect(() => {
    if (!connected) return undefined;
    if (!stateLoading) return undefined;

    const timeoutId = setTimeout(() => {
      setStateLoading(false);
    }, 8000);

    return () => clearTimeout(timeoutId);
  }, [connected, stateLoading]);

  // Derived state from pipelineState
  const latestBuild = pipelineState?.latestBuild || null;
  const history = pipelineState?.pipelines || [];
  const failures = pipelineState?.failures || [];
  const metrics = pipelineState?.metrics || null;
  const aiStatus = pipelineState?.aiStatus || null;
  const stages = pipelineState?.stages || [];

  const metricsUnavailable = disconnected;
  const metricsLoadingState = stateLoading || connectionLoading;
  const m = metrics || {};
  const valTotal = metricsUnavailable ? '—' : (Number.isFinite(m.totalPipelines) ? m.totalPipelines : 0);
  const valActive = metricsUnavailable ? '—' : (Number.isFinite(m.activeBuilds) ? m.activeBuilds : 0);
  const valFailed = metricsUnavailable ? '—' : (Number.isFinite(m.failedToday) ? m.failedToday : 0);
  const valFixTime = metricsUnavailable
    ? '—'
    : (typeof m.avgFixTime === 'number' || typeof m.avgFixTime === 'string' ? m.avgFixTime : '--');
  const valAccuracy = metricsUnavailable ? '—' : (Number.isFinite(m.aiAccuracy) ? `${m.aiAccuracy}%` : '--');

  const showCardsSkeleton = metricsLoadingState && !metrics;
  const showPipelineSkeleton = connected && stateLoading && !latestBuild;
  const tableLoading = connectionLoading || (connected && stateLoading);

  // Bind unified AI analysis state from SSE / REST snapshots without
  // overwriting it when interim events do not yet contain analysis.
  useEffect(() => {
    if (!pipelineState?.aiAnalysis) return;
    if (typeof pipelineState.aiAnalysis !== 'object') return;
    const keys = Object.keys(pipelineState.aiAnalysis);
    if (!keys.length) return;
    setAnalysis(pipelineState.aiAnalysis);
  }, [pipelineState]);

  // Fallback: if SSE never delivers aiAnalysis, fall back to the
  // dedicated latest pipeline REST endpoint to hydrate analysis once.
  useEffect(() => {
    if (analysis) return;

    let cancelled = false;

    (async () => {
      try {
        const latest = await import('../services/api.js').then((m) => m.getLatestPipeline());
        const payload = latest?.data || latest;
        const ai =
          payload?.aiAnalysis ||
          payload?.analysis ||
          payload?.ai ||
          null;
        if (!cancelled && ai && typeof ai === 'object' && Object.keys(ai).length > 0) {
          setAnalysis(ai);
        }
      } catch (err) {
        console.warn('Fallback /pipeline/latest failed', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analysis]);

  const lastUpdatedLabel = useMemo(() => {
    if (!latestBuild?.executedAt) return null;
    const basis = latestBuild.executedAt;
    const diff = Math.floor((Date.now() - new Date(basis).getTime()) / 1000);
    return `Last updated: ${diff}s ago`;
  }, [latestBuild]);

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
            <div className="text-sm text-amber-50/90">
              Connect your Jenkins server to start monitoring pipelines and analyzing CI/CD failures.
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/settings"
                className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-semibold shadow hover:brightness-105 transition-colors"
              >
                Configure Jenkins
              </Link>
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
              <div
                className={`text-xs px-3 py-2 rounded border ${
                  testResult.status === 'success'
                    ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                    : 'border-red-400/40 bg-red-500/10 text-red-100'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metrics Row */}
      {showCardsSkeleton ? (
        <CardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Total Pipelines"
            value={valTotal}
            color="indigo"
            icon="chart-line"
            loading={metricsLoadingState}
            series={[0.2, 0.35, 0.32, 0.4, 0.38, 0.42]}
          />
          <MetricCard
            title="Active Builds"
            value={valActive}
            color="cyan"
            icon="activity"
            loading={metricsLoadingState}
            series={[0.1, 0.2, 0.18, 0.25, 0.22, 0.3]}
          />
          <MetricCard
            title="Failed Today"
            value={valFailed}
            color="red"
            icon="alert"
            loading={metricsLoadingState}
            series={[0.3, 0.28, 0.25, 0.22, 0.2, 0.18]}
          />
          <MetricCard
            title="Avg Fix Time"
            value={valFixTime}
            color="emerald"
            icon="clock"
            loading={metricsLoadingState}
            series={[0.5, 0.48, 0.45, 0.42, 0.4, 0.38]}
          />
          <MetricCard
            title="AI Accuracy"
            value={valAccuracy}
            color="violet"
            icon="brain"
            loading={metricsLoadingState}
            series={[0.6, 0.62, 0.64, 0.66, 0.68, 0.7]}
          />
        </div>
      )}

      {/* Live Pipeline Table */}
      <div className="space-y-2">
        {tableLoading ? (
          <PipelineListSkeleton variant="table" rows={6} />
        ) : (
          <PipelineTable
            rows={connected ? history.slice(0, 6) : []}
            emptyMessage={
              disconnected
                ? 'No pipelines available. Connect Jenkins to fetch pipeline data.'
                : 'No pipelines yet.'
            }
          />
        )}
        {connected && !tableLoading && (
          <div className="flex justify-end">
            <Link
              to="/pipelines"
              className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
            >
              View All Pipelines 
              <span>→</span>
            </Link>
          </div>
        )}
      </div>

      {connected ? (
        <>
          {stateError && (
            <div className="card-surface border border-red-500/30 bg-red-500/10 text-sm text-red-100">
              {stateError}
            </div>
          )}

          {!stateLoading && !latestBuild && (
            <div className="card-surface border border-dashed border-slate-500/40 bg-slate-800/40 text-sm text-slate-100">
              No pipeline executions yet.
            </div>
          )}

          {/* Pipeline Flow Visual and Failure List side-by-side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              {showPipelineSkeleton ? (
                <PipelineFlowSkeleton />
              ) : (
                <>
                  {latestBuild && (
                    <div className="card-surface mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-semibold">{latestBuild.jobName || 'Pipeline'}</div>
                          <div className="text-xs text-gray-600 dark:text-slate-400">
                            Build #{latestBuild.buildNumber} 
                            <span className="mx-1">•</span>
                            {lastUpdatedLabel || '—'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-slate-400">
                          Status: {latestBuild.status || 'UNKNOWN'}
                        </div>
                      </div>
                    </div>
                  )}

                  {latestBuild && (
                    <AnalysisStatusBar
                      stage={aiStatus?.stage}
                      skipped={aiStatus?.skipped}
                      className="mb-3"
                    />
                  )}

                  <div className="flex flex-col gap-2">
                    {latestBuild?.progress && latestBuild.progress !== 'FAILED' && (
                      <PipelineProcessingSteps
                        step={latestBuild.progress}
                        pipelineStatus={latestBuild?.status}
                      />
                    )}
                    <div className="-mt-1">
                      <PipelineFlow
                        stages={stages}
                        buildNumber={latestBuild?.buildNumber}
                        status={latestBuild?.status}
                        durationMs={latestBuild?.duration}
                        jobName={latestBuild?.jobName}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <FailureList failures={failures} />
          </div>

          {/* AI Engine Panel */}
          <AIEngineCard
            stats={{
              analyzedToday: history.filter(
                (r) => r.executedAt && new Date(r.executedAt).toDateString() === new Date().toDateString(),
              ).length,
              avgConfidence: (() => {
                const cs = history
                  .map((r) => (typeof r.confidenceScore === 'number' ? r.confidenceScore : null))
                  .filter((v) => v != null);
                return cs.length ? cs.reduce((a, b) => a + b, 0) / cs.length : 0;
              })(),
              fixesGenerated: 0,
              modelOnline: true,
            }}
          />

          {/* Failure Analysis remains, driven by SSE/queries */}
          {latestBuild && <FailureAnalysis run={latestBuild} analysis={analysis} />}
        </>
      ) : connectionLoading ? (
        <div className="card-surface border border-[var(--border-color)] text-sm text-gray-400 inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Checking Jenkins connection...</span>
        </div>
      ) : (
        <div className="card-surface border border-dashed border-amber-500/30 bg-amber-500/5 text-sm text-amber-100 flex items-start gap-3">
          <PlugZap className="w-5 h-5 mt-0.5" />
          <div>
            <div className="font-semibold">Live dashboards paused</div>
            <div className="text-amber-100/80">
              Reconnect Jenkins to see pipelines, flow visualization, and AI insights.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
