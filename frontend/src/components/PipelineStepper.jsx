const STATUS_STYLES = {
  SUCCESS: {
    dot: 'bg-green-500',
    ring: '',
    text: 'text-green-300',
    label: 'SUCCESS',
  },
  FAILED: {
    dot: 'bg-red-500',
    ring: '',
    text: 'text-red-300',
    label: 'FAILED',
  },
  RUNNING: {
    dot: 'bg-yellow-400',
    ring: 'ring-4 ring-yellow-300/30',
    text: 'text-yellow-200',
    label: 'RUNNING',
  },
  PENDING: {
    dot: 'bg-gray-500',
    ring: '',
    text: 'text-gray-400',
    label: 'PENDING',
  },
};

function normalizeStage(stage) {
  const rawStatus = String(stage?.status || stage?.result || 'PENDING').toUpperCase();
  const status = rawStatus === 'FAILURE'
    ? 'FAILED'
    : rawStatus === 'IN_PROGRESS' || rawStatus === 'PAUSED_PENDING_INPUT'
      ? 'RUNNING'
      : rawStatus === 'NOT_EXECUTED' || rawStatus === 'SKIPPED' || rawStatus === 'UNKNOWN'
        ? 'PENDING'
        : rawStatus;
  const styles = STATUS_STYLES[status] || STATUS_STYLES.PENDING;

  return {
    name: stage?.name || 'Unnamed Stage',
    status,
    tooltip: stage?.context || stage?.name || 'Pipeline stage',
    ...styles,
  };
}

export default function PipelineStepper({ stages = [] }) {
  const normalized = Array.isArray(stages) ? stages.map(normalizeStage) : [];

  return (
    <div className="card-surface">
      <div className="font-semibold mb-3">Pipeline Flow</div>
      {!normalized.length && (
        <div className="text-sm text-gray-400">No stage data available for this build.</div>
      )}
      {!!normalized.length && (
      <div className="relative">
        <div className="absolute left-8 right-8 top-5 h-[2px] bg-[var(--border-color)]" />
        <div className="flex items-center justify-between">
          {normalized.map((s, i) => (
            <div key={`${s.name}-${i}`} className="flex flex-col items-center text-center min-w-0 flex-1">
              <div title={`${s.name}: ${s.label}`} className={`w-8 h-8 rounded-full ${s.dot} ${s.ring} transition-all`} />
              <div className="text-xs mt-2 text-gray-300 truncate max-w-full">{s.name}</div>
              <div className={`text-[10px] mt-1 ${s.text}`}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
