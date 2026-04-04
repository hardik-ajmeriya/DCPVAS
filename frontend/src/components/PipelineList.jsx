export default function PipelineList({ pipelines = [], onSelect }) {
  return (
    <div className="card-surface">
      <div className="font-semibold mb-2">Pipelines</div>
      <div className="divide-y">
        {pipelines.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect?.(p)}
            className="w-full text-left py-2 px-1 transition-all duration-200 ease-in-out hover:bg-gray-50 dark:hover:bg-white/5 hover:scale-[1.01]"
          >
            <div className="font-medium text-gray-900 dark:text-gray-100">{p.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">{p.id} — {p.status}</div>
          </button>
        ))}
        {pipelines.length === 0 && <div className="text-gray-500 dark:text-gray-500">No pipelines.</div>}
      </div>
    </div>
  );
}
