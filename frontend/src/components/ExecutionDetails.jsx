import Skeleton from './ui/Skeleton';

export default function ExecutionDetails({ execution }) {
  if (!execution) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-6 w-14" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  const lines = String(execution?.logs || '').split(/\r?\n/);
  const statusChip = execution?.status === 'SUCCESS'
    ? 'bg-green-100 text-green-800'
    : execution?.status === 'FAILURE' || execution?.status === 'FAILED'
      ? 'bg-red-100 text-red-800'
      : 'bg-gray-100 text-gray-800';

  return (
    <div className="space-y-4">
      {/* Header summary */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600">{execution?.jobName || 'Pipeline'}</div>
          <div className="text-lg font-semibold">#{execution?.buildNumber}</div>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${statusChip}`}>{(execution?.status || 'UNKNOWN').toUpperCase()}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Failed Stage:</span>
          <span className="font-medium text-gray-700">{execution?.failedStage || '—'}</span>
        </div>
        <div className="text-gray-700">{execution?.executedAt ? new Date(execution.executedAt).toLocaleString() : '—'}</div>
      </div>

      {/* Human Summary */}
      <section className="p-3 rounded border">
        <div className="font-medium mb-2">Human Summary</div>
        {execution?.humanSummary?.overview ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{execution.humanSummary.overview}</p>
        ) : (
          <p className="text-sm text-gray-600">No summary available.</p>
        )}
        {Array.isArray(execution?.humanSummary?.failureCause) && execution.humanSummary.failureCause.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-medium text-gray-800">Failure Cause</div>
            <ul className="list-disc ml-5 text-sm text-gray-700">
              {execution.humanSummary.failureCause.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {Array.isArray(execution?.humanSummary?.pipelineImpact) && execution.humanSummary.pipelineImpact.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-medium text-gray-800">Pipeline Impact</div>
            <ul className="list-disc ml-5 text-sm text-gray-700">
              {execution.humanSummary.pipelineImpact.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Suggested Fix */}
      <section className="p-3 rounded border">
        <div className="font-medium mb-2">Suggested Fix</div>
        {Array.isArray(execution?.suggestedFix?.immediateActions) && execution.suggestedFix.immediateActions.length > 0 ? (
          <div>
            <div className="text-sm font-medium text-gray-800">Immediate Actions</div>
            <ul className="list-disc ml-5 text-sm text-gray-700">
              {execution.suggestedFix.immediateActions.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-600">No immediate actions.</p>
        )}
        {Array.isArray(execution?.suggestedFix?.debuggingSteps) && execution.suggestedFix.debuggingSteps.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-medium text-gray-800">Debugging Steps</div>
            <ul className="list-disc ml-5 text-sm text-gray-700">
              {execution.suggestedFix.debuggingSteps.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {Array.isArray(execution?.suggestedFix?.verification) && execution.suggestedFix.verification.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-medium text-gray-800">Verification</div>
            <ul className="list-disc ml-5 text-sm text-gray-700">
              {execution.suggestedFix.verification.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Technical Recommendation */}
      <section className="p-3 rounded border">
        <div className="font-medium mb-2">Technical Recommendation</div>
        {Array.isArray(execution?.technicalRecommendation?.codeLevelActions) && execution.technicalRecommendation.codeLevelActions.length > 0 ? (
          <pre className="text-sm bg-gray-900 text-gray-100 p-3 rounded whitespace-pre-wrap font-mono">{execution.technicalRecommendation.codeLevelActions.join('\n')}</pre>
        ) : (
          <p className="text-sm text-gray-600">No code-level actions.</p>
        )}
        {Array.isArray(execution?.technicalRecommendation?.pipelineImprovements) && execution.technicalRecommendation.pipelineImprovements.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-medium text-gray-800">Pipeline Improvements</div>
            <ul className="list-disc ml-5 text-sm text-gray-700">
              {execution.technicalRecommendation.pipelineImprovements.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {Array.isArray(execution?.technicalRecommendation?.preventionStrategies) && execution.technicalRecommendation.preventionStrategies.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-medium text-gray-800">Prevention Strategies</div>
            <ul className="list-disc ml-5 text-sm text-gray-700">
              {execution.technicalRecommendation.preventionStrategies.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Raw Logs */}
      <section className="p-3 rounded border">
        <div className="font-medium mb-2">Raw Logs</div>
        {lines.length === 1 && lines[0] === '' ? (
          <p className="text-sm text-gray-600">No logs available.</p>
        ) : (
          <div className="log-viewer p-3 rounded max-h-[50vh] overflow-auto">
            <div className="font-mono text-xs whitespace-pre">
              {lines.map((line, i) => (
                <div key={i}>{line || ' '}</div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
