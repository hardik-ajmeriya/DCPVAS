import { Link } from 'react-router-dom';

export default function FailureList({ failures = [] }) {
  const recent = Array.isArray(failures) ? failures.slice(0, 5) : [];

  return (
    <div className="card-surface flex flex-col gap-3 h-auto">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Recent Failures</div>
        <Link to="/failures" className="text-sm text-blue-400 hover:text-blue-300">View All →</Link>
      </div>

      <div className="flex flex-col gap-3">
        {recent.map((f) => {
          const status = String(f.status || f.buildStatus || 'UNKNOWN').toUpperCase();
          const confidencePct = typeof f.confidenceScore === 'number' ? Math.round(f.confidenceScore * 100) : null;
          return (
            <div
              key={f._id || `${f.jobName || 'pipeline'}#${f.buildNumber}`}
              className="rounded-lg border border-slate-800/80 bg-[var(--bg-secondary)] p-3 hover:bg-slate-800/40 transition"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{f.jobName || 'Pipeline'} #{f.buildNumber}</p>
                  <p className="text-xs text-slate-400">{f.failedStage || f.detectedError || 'Unknown stage'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{f.executedAt ? new Date(f.executedAt).toLocaleString() : '—'}</p>
                  {confidencePct != null && (
                    <p className="text-xs text-green-400">AI confidence: {confidencePct}%</p>
                  )}
                  <p className="text-xs text-slate-300">Status: {status}</p>
                </div>
              </div>
            </div>
          );
        })}

        {recent.length === 0 && (
          <p className="text-sm text-slate-400">No recent failures 🎉</p>
        )}
      </div>
    </div>
  );
}
