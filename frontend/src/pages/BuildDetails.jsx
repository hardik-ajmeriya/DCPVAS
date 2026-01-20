import { useEffect, useState } from 'react';
import FailureAnalysis from '../components/FailureAnalysis.jsx';
import { getPipelineBuild } from '../services/api.js';

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
              {data?.analysis?.failedStage && (
                <span className="text-xs text-gray-600">Failed Stage: {data.analysis.failedStage}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {data && <FailureAnalysis run={data} />}
    </div>
  );
}
