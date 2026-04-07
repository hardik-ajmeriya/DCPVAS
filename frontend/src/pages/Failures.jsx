import { useEffect, useState, useMemo } from 'react';
import { getPipelineHistory } from '../services/api.js';
import FailureListSkeleton from '../components/skeletons/FailureListSkeleton';

export default function Failures() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const history = await getPipelineHistory('all');
        if (!mounted) return;
        const failures = Array.isArray(history)
          ? history.filter((r) => ['FAILURE', 'FAILED'].includes(String(r.status || '').toUpperCase()))
          : [];
        failures.sort((a, b) => {
          const aTime = new Date(a.executedAt || 0).getTime();
          const bTime = new Date(b.executedAt || 0).getTime();
          return bTime - aTime;
        });
        setRows(failures);
        setLoading(false);
        setError('');
      } catch (err) {
        if (!mounted) return;
        setError('Failed to load failures');
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const tableRows = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-4">
      <div className="card-surface">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">All Failures</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Full failure history across pipelines</div>
          </div>
        </div>

        {loading && <FailureListSkeleton variant="table" rows={8} />}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {!loading && !error && (
          tableRows.length ? (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-gray-600 dark:text-gray-400">
                    <th className="text-left py-2 pr-3">Pipeline</th>
                    <th className="text-left py-2 pr-3">Stage</th>
                    <th className="text-left py-2 pr-3">Failure Time</th>
                    <th className="text-left py-2 pr-3">AI Confidence</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {tableRows.map((r) => {
                    const status = String(r.status || r.buildStatus || 'UNKNOWN').toUpperCase();
                    const confidence = typeof r.confidenceScore === 'number' ? Math.round(r.confidenceScore * 100) : null;
                    return (
                      <tr key={r._id || `${r.jobName || 'pipeline'}#${r.buildNumber}`} className="transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="py-2 pr-3 font-medium text-gray-900 dark:text-gray-100">{r.jobName || 'Pipeline'} #{r.buildNumber}</td>
                        <td className="py-2 pr-3 text-gray-600 dark:text-gray-300">{r.failedStage || r.detectedError || '—'}</td>
                        <td className="py-2 pr-3 text-gray-600 dark:text-gray-400">{r.executedAt ? new Date(r.executedAt).toLocaleString() : '—'}</td>
                        <td className="py-2 pr-3 text-gray-600 dark:text-gray-300">{confidence != null ? `${confidence}%` : '—'}</td>
                        <td className={`py-2 text-sm ${status === 'FAILURE' || status === 'FAILED' ? 'text-red-500 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>{status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">No failures recorded 🎉</p>
          )
        )}
      </div>
    </div>
  );
}
