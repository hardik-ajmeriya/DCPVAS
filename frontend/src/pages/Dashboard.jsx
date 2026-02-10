import { useEffect, useMemo, useRef, useState } from 'react';
import FailureAnalysis from '../components/FailureAnalysis.jsx';
import { getLatestPipeline } from '../services/api.js';
import { ProgressBar } from '../components/FailureAnalysis.jsx';

export default function Dashboard({ mode }) {
  const [buildData, setBuildData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollingRef = useRef(null);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

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

        setBuildData((prev) => {
          if (!prev) {
            setLoading(false);
            setError('');
            return normalized;
          }
          if (
            prev.buildNumber !== normalized.buildNumber ||
            prev.progress !== normalized.progress ||
            prev.status !== normalized.status
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

  // Stepper depends only on backend state via buildData.progress
  const lastUpdatedLabel = useMemo(() => {
    if (!buildData?.executedAt) return null;
    const basis = buildData.executedAt;
    const diff = Math.floor((Date.now() - new Date(basis).getTime()) / 1000);
    return `Last updated: ${diff}s ago`;
  }, [buildData]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">Dashboard</div>
          <div className="text-sm text-green-700">Latest execution summary {lastUpdatedLabel ? `• ${lastUpdatedLabel}` : ''}</div>
          <p className="text-xs text-gray-500 mt-1">Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {buildData && (
        <div className="p-4 bg-white rounded shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{buildData.jobName || 'Pipeline'}</div>
              <div className="text-sm text-gray-600">Build #{buildData.buildNumber}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-xs ${buildData.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : buildData.status === 'FAILURE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                {buildData.status}
              </span>
              {buildData?.failedStage && (
                <span className="text-xs text-gray-600">Failed Stage: {buildData.failedStage}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Centered progress stepper after build information */}
      {buildData?.progress && buildData.progress !== 'FAILED' && (
        <ProgressBar step={buildData.progress} />
      )}

      {buildData && <FailureAnalysis run={buildData} />}
      {buildData && (buildData.progress === 'ANALYSIS_IN_PROGRESS' || buildData.analysisStatus === 'ANALYSIS_IN_PROGRESS') && (
        <div className="text-sm text-gray-600 mt-2">
          Analyzing logs… please wait
          {buildData.analysisStep && (
            <span className="ml-2">(Step: {buildData.analysisStep})</span>
          )}
        </div>
      )}
    </div>
  );
}
