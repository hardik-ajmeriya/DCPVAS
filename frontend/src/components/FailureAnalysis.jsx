import { useState } from 'react';

const tabs = ['Human Summary', 'Suggested Fix', 'Technical Recommendation', 'Raw Logs'];

export default function FailureAnalysis({ run }) {
  const [tab, setTab] = useState('Human Summary');
  if (!run) return null;

  return (
    <div className="p-4 bg-white rounded shadow mt-4">
      <div className="font-semibold mb-3">Failure Analysis</div>

      <div className="flex gap-2 mb-3">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 rounded ${tab === t ? 'bg-neutral text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Human Summary' && (
        <div>
          <h3 className="font-semibold">Human Summary</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{run.humanSummary}</p>
        </div>
      )}

      {tab === 'Suggested Fix' && (
        <div>
          <h3 className="font-semibold">Suggested Fix</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{run.suggestedFix}</p>
        </div>
      )}

      {tab === 'Technical Recommendation' && (
        <div>
          <h3 className="font-semibold">Technical Recommendation</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{run.technicalRecommendation}</p>
        </div>
      )}

      {tab === 'Raw Logs' && (
        <div>
          <h3 className="font-semibold">Raw Logs</h3>
          <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-64 font-mono whitespace-pre-wrap">{run.rawLogs || run.logs}</pre>
        </div>
      )}
    </div>
  );
}
