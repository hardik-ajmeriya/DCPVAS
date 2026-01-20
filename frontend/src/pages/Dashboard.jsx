import { useEffect, useMemo, useState } from 'react';
import FailureAnalysis from '../components/FailureAnalysis.jsx';
import { getLatestPipeline } from '../services/api.js';

export default function Dashboard({ mode }) {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getLatestPipeline();
        setLatest(data);
        setError('');
      } catch (e) {
        setError('Failed to load latest');
        setLatest(null);
      } finally {
        setLoading(false);
      }
    }

    load();
    // Initial load only; polling handled in another effect
  }, []);
  // Poll every 3s while analysis is in progress; stop when ready
  useEffect(() => {
    if (!latest || latest.analysisStatus !== 'ANALYSIS_IN_PROGRESS') return;
    const t = setInterval(async () => {
      try {
        const data = await getLatestPipeline();
        setLatest(data);
        if (data.analysisStatus === 'READY') {
          clearInterval(t);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [latest?.analysisStatus]);

  const lastUpdatedLabel = useMemo(() => {
    if (!latest?.executedAt) return null;
    const basis = latest.executedAt;
    const diff = Math.floor((Date.now() - new Date(basis).getTime()) / 1000);
    return `Last updated: ${diff}s ago`;
  }, [latest]);

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

      {latest && (
        <div className="p-4 bg-white rounded shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{latest.jobName || 'Pipeline'}</div>
              <div className="text-sm text-gray-600">Build #{latest.buildNumber}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-xs ${latest.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : latest.status === 'FAILURE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                {latest.status}
              </span>
              {latest?.failedStage && (
                <span className="text-xs text-gray-600">Failed Stage: {latest.failedStage}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {latest && <FailureAnalysis run={latest} />}
      {latest && latest.analysisStatus === 'ANALYSIS_IN_PROGRESS' && (
        <div className="text-sm text-gray-600 mt-2">
          Analyzing logs… please wait
          {latest.analysisStep && (
            <span className="ml-2">(Step: {latest.analysisStep})</span>
          )}
        </div>
      )}
    </div>
  );
}
