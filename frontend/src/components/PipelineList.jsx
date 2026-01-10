export default function PipelineList({ pipelines = [], onSelect }) {
  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="font-semibold mb-2">Pipelines</div>
      <div className="divide-y">
        {pipelines.map((p) => (
          <button key={p.id} onClick={() => onSelect?.(p)} className="w-full text-left py-2 hover:bg-gray-50">
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-gray-500">{p.id} — {p.status}</div>
          </button>
        ))}
        {pipelines.length === 0 && <div className="text-gray-500">No pipelines.</div>}
      </div>
    </div>
  );
}
