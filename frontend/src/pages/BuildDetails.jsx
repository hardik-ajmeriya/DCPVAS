import { useEffect, useState } from 'react';
import FailureAnalysis from '../components/FailureAnalysis.jsx';
import PipelineGraph from '../components/PipelineGraph.jsx';
import { getPipelineBuild } from '../services/api.js';
import { subscribeAnalysis, subscribeBuilds } from '../services/socket.js';

export default function BuildDetails({ buildNumber }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!buildNumber) return;
    (async () => {
      try {
        setLoading(true);
        const d = await getPipelineBuild(buildNumber);
        setData(d);
        setError('');
      } catch (e) {
        setError('Failed to load build');
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [buildNumber]);

  useEffect(() => {
    if (!buildNumber) return;
    // Subscribe to analysis and build lifecycle events for this build
    const unsubA = subscribeAnalysis({
      onProgress: (payload) => {
        if (payload?.buildNumber !== buildNumber) return;
        // Update minimal analysis state optimistically
        setData((prev) => prev ? { ...prev, analysisStatus: 'ANALYSIS_IN_PROGRESS', analysisStep: payload.step || prev.analysisStep } : prev);
      },
      onComplete: async (payload) => {
        if (payload?.buildNumber !== buildNumber) return;
        try {
          const fresh = await getPipelineBuild(buildNumber);
          setData(fresh);
        } catch {}
      },
    });
    const unsubB = subscribeBuilds({
      onNew: () => {},
      onSuccess: async (payload) => {
        if (payload?.buildNumber !== buildNumber) return;
        try {
          const fresh = await getPipelineBuild(buildNumber);
          setData(fresh);
        } catch {}
      },
    });
    return () => {
      unsubA();
      unsubB();
    };
  }, [buildNumber]);

  if (!buildNumber) return <div className="text-sm text-gray-500">No build selected.</div>;
  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded shadow">
        {loading && <div className="text-sm text-gray-500">Loading…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {data && (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{data.jobName || 'Pipeline'}</div>
              <div className="text-sm text-gray-600">Build #{data.buildNumber}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-xs ${data.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : data.status === 'FAILURE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                {data.status}
              </span>
              {(data?.failedStage || data?.analysis?.failedStage) && (
                <span className="text-xs text-gray-600">Failed Stage: {data.failedStage || data?.analysis?.failedStage}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {data?.status === 'SUCCESS' && (
        <div className="rounded border border-green-300 bg-green-50 text-green-800 px-3 py-2 text-sm">✅ Pipeline Completed Successfully</div>
      )}

      {data?.stages && <PipelineGraph run={data} />}

      {data && <FailureAnalysis run={data} />}
    </div>
  );
}
