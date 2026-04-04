export default function FailureTimeline({ items = [], onOpenLogs, onSelect }) {
  if (!items.length) return <div className="p-4 bg-white rounded shadow">No failures detected.</div>;
  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="font-semibold mb-2">Failure Intelligence Timeline</div>
      <div className="divide-y">
        {items.map((it) => (
          <div key={`${it.jobName}-${it.buildNumber}`} className="py-3 flex items-start justify-between gap-4 hover:bg-gray-50 rounded">
            <button className="text-left flex-1" onClick={() => onSelect?.(it)}>
              <div className="flex items-center gap-3">
                <div className="font-medium">{it.jobName} #{it.buildNumber}</div>
                <div className="text-xs text-gray-500">{it.executedAt ? new Date(it.executedAt).toLocaleString() : ''}</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                <div>
                  <div className="text-gray-500">Failure DNA</div>
                  <div>
                    {it.insights.failure.stage ? `${it.insights.failure.stage} • ` : ''}
                    {it.insights.failure.errorType} • {it.insights.failure.scriptType} • x{it.insights.failure.repeatCount}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Next Action</div>
                  <div className="uppercase font-semibold">{it.insights.recommendation}</div>
                </div>
                <div>
                  <div className="text-gray-500">Blast Radius</div>
                  <div>{it.insights.blastRadius}</div>
                </div>
                <div>
                  <div className="text-gray-500">Cost</div>
                  <div>{it.insights.cost.wastedCiMinutes ?? '?'} min{it.insights.cost.skippedDeploys ? ' • deploy skipped' : ''}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">Confidence: {(Math.round(it.insights.rootCauseConfidence * 100))}%</div>
              {Array.isArray(it.insights.replay) && it.insights.replay.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="text-gray-500">Execution Replay</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {it.insights.replay.slice(0, 6).map((s, idx) => (
                      <span key={idx} className={`px-2 py-1 rounded border ${s.status === 'FAILED' ? 'border-red-400 text-red-600' : s.status === 'SKIPPED' ? 'border-yellow-400 text-yellow-700' : 'border-gray-300 text-gray-700'}`}>
                        {s.stage}: {s.status}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </button>
            <div className="pt-1">
              <button onClick={() => onOpenLogs?.(it)} className="px-2 py-1 text-xs rounded bg-gray-900 text-gray-50 hover:bg-gray-800 dark:bg-black dark:text-white dark:hover:bg-neutral">Terminal</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
