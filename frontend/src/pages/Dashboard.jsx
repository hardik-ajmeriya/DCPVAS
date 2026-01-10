import { useEffect, useMemo, useState } from 'react';
import FailureAnalysis from '../components/FailureAnalysis.jsx';
import { getExecutions, getExecution } from '../services/api.js';

export default function Dashboard({ mode }) {
  const [pipeline, setPipeline] = useState(null);
  const [latestId, setLatestId] = useState(null);

  useEffect(() => {
    async function loadLatestExecution() {
      try {
        const list = await getExecutions();
        if (Array.isArray(list) && list.length) {
          const latest = list[0];
          setLatestId(latest._id);
          const detail = await getExecution(latest._id);
          setPipeline(detail);
        } else {
          setPipeline(null);
        }
      } catch (e) {
        console.error('Failed to load latest execution:', e?.message || e);
      }
    }

    loadLatestExecution();
    const t = setInterval(loadLatestExecution, 10000);
    return () => clearInterval(t);
  }, []);

  const lastUpdatedLabel = useMemo(() => {
    if (!pipeline?.executedAt && !pipeline?.lastUpdated && !pipeline?.startedAt) return null;
    const basis = pipeline.executedAt || pipeline.lastUpdated || pipeline.startedAt;
    const diff = Math.floor((Date.now() - new Date(basis).getTime()) / 1000);
    return `Last updated: ${diff}s ago`;
  }, [pipeline]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">Dashboard</div>
          <div className="text-sm text-green-700">Latest execution summary {lastUpdatedLabel ? `• ${lastUpdatedLabel}` : ''}</div>
          <p className="text-xs text-gray-500 mt-1">Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      <FailureAnalysis run={pipeline} />
    </div>
  );
}
