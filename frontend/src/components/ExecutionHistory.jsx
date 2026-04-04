export default function ExecutionHistory({ history, onSelect, onOpenLogs }) {
  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="font-semibold mb-2">Execution History</div>
      <div className="divide-y">
        {history.map((h) => (
          <div key={h._id || h.id || h.buildNumber} className="py-2 flex items-center justify-between hover:bg-gray-50 rounded">
            <button
              onClick={() => onSelect?.(h)}
              className="text-left flex-1 px-2"
              aria-label={`Select run ${h._id || h.id}`}
            >
              <div>
                <div className="font-medium">{h.jobName ? `${h.jobName} ` : ''}{h.buildNumber ? `#${h.buildNumber}` : ''}</div>
                <div className="text-xs text-gray-500">{new Date(h.executedAt || h.startedAt).toLocaleString()}</div>
              </div>
            </button>
            <div className="flex items-center gap-3 pr-2">
              <div className={`text-sm ${h.status === 'SUCCESS' ? 'text-success' : (h.status === 'FAILED' || h.status === 'FAILURE') ? 'text-failure' : 'text-gray-600'}`}>{h.status === 'FAILURE' ? 'FAILED' : h.status}</div>
              {h.failedStage && <div className="text-xs text-gray-600">{h.failedStage}</div>}
              { (h.status === 'SUCCESS' || (h.aiAnalysis && h.aiAnalysis.skipped)) && (
                <span className="text-xs text-gray-600">AI Analysis: Not Required</span>
              )}
              <button
                onClick={() => onOpenLogs?.(h)}
                className="px-2 py-1 text-xs rounded bg-gray-900 text-gray-50 hover:bg-gray-800 dark:bg-black dark:text-white dark:hover:bg-neutral"
                aria-label="Open terminal logs"
              >
                Terminal
              </button>
            </div>
          </div>
        ))}
        {history.length === 0 && <div className="text-gray-500">No runs yet.</div>}
      </div>
    </div>
  );
}
