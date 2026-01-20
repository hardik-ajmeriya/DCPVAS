import { useEffect, useState } from 'react';
import FailureAnalysis from '../components/FailureAnalysis.jsx';
import { getPipelineHistory, getPipelineBuild } from '../services/api.js';

export default function History() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getPipelineHistory('all');
        setRows(Array.isArray(data) ? data : []);
        setError('');
      } catch (e) {
        setError('Failed to load history');
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const viewBuild = async (num) => {
    try {
      const detail = await getPipelineBuild(num);
      setSelected(detail);
    } catch (e) {
      setSelected(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-xl font-semibold">Execution History</div>

      <div className="p-4 bg-white rounded shadow">
        {loading && <div className="text-sm text-gray-500">Loading…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && rows.length === 0 && <div className="text-sm text-gray-500">No history yet.</div>}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">Build #</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Failed Stage</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.buildNumber}>
                    <td className="py-2 pr-4 font-medium">#{r.buildNumber}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-1 rounded text-xs ${r.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : r.status === 'FAILURE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-700">{r.failedStage || '—'}</td>
                    <td className="py-2 pr-4 text-gray-700">{r.executedAt ? new Date(r.executedAt).toLocaleString() : '—'}</td>
                    <td className="py-2 pr-4">
                      <button className="px-3 py-1 rounded bg-black text-white text-xs hover:bg-neutral" onClick={() => viewBuild(r.buildNumber)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <FailureAnalysis run={selected} />}
    </div>
  );
}
