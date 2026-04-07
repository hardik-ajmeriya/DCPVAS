import { Link } from 'react-router-dom';
import FailureListSkeleton from './skeletons/FailureListSkeleton';

export default function FailureList({ failures = [], loading = false }) {
  if (loading) {
    return <FailureListSkeleton variant="compact" rows={5} />;
  }

  const recent = Array.isArray(failures) ? failures.slice(0, 5) : [];

  return (
    <div className="card-surface flex flex-col gap-3 h-auto">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-900 dark:text-slate-100">Recent Failures</div>
        <Link to="/failures" className="text-sm text-blue-400 hover:text-blue-300">View All →</Link>
      </div>

      <div className="flex flex-col gap-3">
        {recent.map((f) => {
          const status = String(f.status || f.buildStatus || 'UNKNOWN').toUpperCase();
          const confidencePct = typeof f.confidenceScore === 'number' ? Math.round(f.confidenceScore * 100) : null;
          return (
            <div
              key={f._id || `${f.jobName || 'pipeline'}#${f.buildNumber}`}
              className="rounded-lg border border-gray-200 dark:border-slate-800/80 bg-white dark:bg-[var(--bg-secondary)] p-3 hover:bg-gray-50 dark:hover:bg-slate-800/40 transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{f.jobName || 'Pipeline'} #{f.buildNumber}</p>
                  <p className="text-xs text-gray-600 dark:text-slate-400">{f.failedStage || f.detectedError || 'Unknown stage'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600 dark:text-slate-400">{f.executedAt ? new Date(f.executedAt).toLocaleString() : '—'}</p>
                  {confidencePct != null && (
                    <p className="text-xs text-emerald-600 dark:text-green-400">AI confidence: {confidencePct}%</p>
                  )}
                  <p className="text-xs text-gray-700 dark:text-slate-300">Status: {status}</p>
                </div>
              </div>
            </div>
          );
        })}

        {recent.length === 0 && (
          <p className="text-sm text-gray-600 dark:text-slate-400">No recent failures 🎉</p>
        )}
      </div>
    </div>
  );
}
