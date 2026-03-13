export default function AIEngineCard({ stats }) {
  const { analyzedToday = 0, avgConfidence = 0, fixesGenerated = 0, modelOnline = true } = stats || {};
  return (
    <div className="card-surface">
      <div className="flex items-center justify-between">
        <div className="font-semibold">AI Engine</div>
        <span className={`px-2 py-1 rounded-full text-xs ${modelOnline ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{modelOnline ? 'Online' : 'Offline'}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <Stat label="Analyzed Today" value={analyzedToday} />
        <Stat label="Avg Confidence" value={`${Math.round(avgConfidence * 100)}%`} />
        <Stat label="Fixes Generated" value={fixesGenerated} />
        <Stat label="Model Status" value={modelOnline ? 'Healthy' : 'Degraded'} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
