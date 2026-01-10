export default function PipelineGraph({ run }) {
  if (!run) return <div className="text-gray-500">No pipeline selected.</div>;
  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="font-semibold mb-2">Pipeline Stages</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {run.stages.map((s) => (
          <div key={s.name} className={`p-3 rounded border flex flex-col items-center ${
            s.status === 'SUCCESS' ? 'border-success text-success' : s.status === 'FAILED' ? 'border-failure text-failure' : 'border-neutral text-neutral'
          }`}>
            <div className="font-medium">{s.name}</div>
            <div className="text-sm">{s.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
