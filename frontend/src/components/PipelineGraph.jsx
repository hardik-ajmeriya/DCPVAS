const STATUS_CONFIG = {
  SUCCESS: {
    border: 'border-green-500',
    bg: 'bg-green-50',
    text: 'text-green-700',
    dot: 'bg-green-500',
    label: 'SUCCESS',
  },
  FAILED: {
    border: 'border-red-500',
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
    label: 'FAILED',
  },
  RUNNING: {
    border: 'border-yellow-400',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    dot: 'bg-yellow-400',
    label: 'RUNNING',
  },
  PENDING: {
    border: 'border-gray-300',
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    dot: 'bg-gray-300',
    label: 'PENDING',
  },
};

export default function PipelineGraph({ run }) {
  if (!run) return <div className="text-gray-500 p-4">No pipeline selected.</div>;

  const stages = Array.isArray(run.stages) ? run.stages : [];

  if (!stages.length) {
    return (
      <div className="p-4 bg-white rounded shadow">
        <div className="font-semibold mb-2">Pipeline Stages</div>
        <div className="text-sm text-gray-400">No stage data available for this build.</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="font-semibold mb-3">Pipeline Stages</div>
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        {stages.map((s, idx) => {
          const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.PENDING;
          return (
            <div key={s.name} className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={`flex-1 p-3 rounded border ${cfg.bg} ${cfg.border} flex flex-col items-center`}
              >
                <span className={`flex items-center gap-1.5 text-sm font-medium ${cfg.text}`}>
                  <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${cfg.dot}`} />
                  {s.name}
                </span>
                <span className={`text-xs mt-1 ${cfg.text}`}>{cfg.label}</span>
              </div>
              {idx < stages.length - 1 && (
                <span className="text-gray-400 text-base hidden sm:inline flex-shrink-0">→</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
