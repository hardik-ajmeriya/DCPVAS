import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import FailureAnalysis from '../components/FailureAnalysis.jsx';
import { getLatestPipeline, getPipelineHistory, getDashboardMetrics } from '../services/api.js';
import MetricCard from '../components/MetricCard.jsx';
import PipelineTable from '../components/PipelineTable.jsx';
import PipelineFlow from '../components/PipelineFlow.jsx';
import FailureList from '../components/FailureList.jsx';
import AIEngineCard from '../components/AIEngineCard.jsx';
import PipelineProcessingSteps from '../components/PipelineProcessingSteps.jsx';
import { subscribeBuilds, subscribeAnalysis } from '../services/socket.js';

export default function Dashboard({ mode }) {
  const [buildData, setBuildData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollingRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

    const getStagesSignature = (data) => {
      if (!Array.isArray(data?.stages)) return '';
      return data.stages.map((stage) => `${stage?.name || ''}:${stage?.status || ''}`).join('|');
    };

    const poll = async () => {
      try {
        // Prefer no-cache fetch to avoid browser caching stale GET responses
        let data = null;
        try {
          const res = await fetch(`${apiBase}/pipeline/latest?_ts=${Date.now()}`, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
          });
          data = await res.json();
        } catch {
          data = await getLatestPipeline();
        }

        // Normalize progress to ensure stepper consistency
        const progress = data?.progress ?? data?.analysisStatus ?? data?.analysisStep ?? null;
        const normalized = { ...(data || {}), progress };
        console.log('[Dashboard] latest build stages:', normalized?.stages || []);

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
        console.error('Polling error', e);
        setError('Failed to load latest');
      }
    };

    // Initial poll and start interval (single continuous loop)
    poll();
    if (!pollingRef.current) {
      pollingRef.current = setInterval(poll, 1500);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // Dashboard metrics: fetch on mount, refresh every 20s, and on live events
  useEffect(() => {
    let intervalId = null;
    let mounted = true;
    const refresh = async () => {
      try {
        const m = await getDashboardMetrics();
        if (!mounted) return;
        if (m && typeof m === 'object') {
          setMetrics(m);
        } else {
          // Fallback: render blanks
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
    refresh();
    // Poll every 20s
    intervalId = setInterval(refresh, 20000);

    // Subscribe to build lifecycle and analysis completion to trigger refresh
    const unsubBuilds = subscribeBuilds({
      onNew: () => refresh(),
      onStarted: () => refresh(),
      onCompleted: () => refresh(),
    });
    const unsubAnalysis = subscribeAnalysis({
      onCompleted: () => refresh(),
      onProgress: () => {},
    });

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      unsubBuilds();
      unsubAnalysis();
    };
  }, []);

  // Load history once and keep live updates via sockets
  useEffect(() => {
    (async () => {
      try {
        const runs = await getPipelineHistory('all');
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
    return () => { unsubBuilds(); unsubAnalysis(); };
  }, []);

  // Stepper depends only on backend state via buildData.progress
  const lastUpdatedLabel = useMemo(() => {
    if (!buildData?.executedAt) return null;
    const basis = buildData.executedAt;
    const diff = Math.floor((Date.now() - new Date(basis).getTime()) / 1000);
    return `Last updated: ${diff}s ago`;
  }, [buildData]);

  // Helper to format values safely
  const m = metrics || {};
  const valTotal = Number.isFinite(m.totalPipelines) ? m.totalPipelines : 0;
  const valActive = Number.isFinite(m.activeBuilds) ? m.activeBuilds : 0;
  const valFailed = Number.isFinite(m.failedToday) ? m.failedToday : 0;
  const valFixTime = typeof m.avgFixTime === 'number' || typeof m.avgFixTime === 'string' ? m.avgFixTime : '--';
  const valAccuracy = Number.isFinite(m.aiAccuracy) ? `${m.aiAccuracy}%` : '--';

  return (
    <div className="p-6 space-y-6">
      {/* Metrics Row (modern cards with unique gradients and stroke colors) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard title="Total Pipelines" value={valTotal} color="indigo" icon="chart-line" loading={metricsLoading} series={[0.2,0.35,0.32,0.4,0.38,0.42]} />
        <MetricCard title="Active Builds" value={valActive} color="cyan" icon="activity" loading={metricsLoading} series={[0.1,0.2,0.18,0.25,0.22,0.3]} />
        <MetricCard title="Failed Today" value={valFailed} color="red" icon="alert" loading={metricsLoading} series={[0.3,0.28,0.25,0.22,0.2,0.18]} />
        <MetricCard title="Avg Fix Time" value={valFixTime} color="emerald" icon="clock" loading={metricsLoading} series={[0.5,0.48,0.45,0.42,0.4,0.38]} />
        <MetricCard title="AI Accuracy" value={valAccuracy} color="violet" icon="brain" loading={metricsLoading} series={[0.6,0.62,0.64,0.66,0.68,0.7]} />
      </div>

      {/* Live Pipeline Table */}
      <div className="space-y-2">
        <PipelineTable rows={history.slice(0, 6)} />
        <div className="flex justify-end">
          <Link to="/pipelines" className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1">
            View All Pipelines →
          </Link>
        </div>
      </div>

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
    </div>
  );
}
