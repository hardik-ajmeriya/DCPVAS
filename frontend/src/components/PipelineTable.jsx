export default function PipelineTable({ rows = [], onSelect, title = 'Live Pipelines', subtitle = 'Auto-updates • No refresh' }) {
  return (
    <div className="card-surface">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">{title}</div>
        {subtitle ? <div className="text-xs text-gray-400">{subtitle}</div> : <div />}
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left py-2 pr-3">Pipeline</th>
              <th className="text-left py-2 pr-3">Branch</th>
              <th className="text-left py-2 pr-3">Commit</th>
              <th className="text-left py-2 pr-3">Duration</th>
              <th className="text-left py-2 pr-3">Status</th>
              <th className="text-left py-2">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {rows.map((r) => {
              const status = String(r.status || r.buildStatus || 'UNKNOWN').toUpperCase();
              const isRunning = status === 'BUILDING' || status === 'RUNNING';
              const statusColor =
                status === 'SUCCESS' ? 'text-green-400' :
                status === 'FAILURE' || status === 'FAILED' ? 'text-red-400' :
                isRunning ? 'text-purple-300' : 'text-gray-400';
              const label = isRunning ? 'Running' : (status === 'SUCCESS' ? 'Passed' : status === 'FAILURE' || status === 'FAILED' ? 'Failed' : 'Unknown');
              const key = r._id || `${r.jobName || 'pipeline'}#${r.buildNumber}`;
              return (
                <tr key={key} className="hover-surface">
                  <td className="py-2 pr-3 font-medium">{r.jobName || 'Pipeline'} #{r.buildNumber}</td>
                  <td className="py-2 pr-3 text-gray-400">{r.branch || '—'}</td>
                  <td className="py-2 pr-3 text-gray-400">{(r.commit || '').slice(0, 7) || '—'}</td>
                  <td className="py-2 pr-3 text-gray-400">{r.duration || '—'}</td>
                  <td className={`py-2 pr-3 ${statusColor} ${isRunning ? 'pulse-running' : ''}`}>{label}</td>
                  <td className="py-2 text-gray-400">{r.executedAt ? new Date(r.executedAt).toLocaleString() : '—'}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan="6" className="py-6 text-center text-gray-500">No pipelines yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
