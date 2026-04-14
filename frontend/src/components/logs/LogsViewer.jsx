import React, { memo } from 'react';
import PipelineLogsTable from './PipelineLogsTable';

function LogsViewerInner({ logs, loading, hasSelectedBuild, error }) {
  let body = null;

  if (!hasSelectedBuild) {
    body = (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">
        Select a build to view logs.
      </div>
    );
  } else if (loading) {
    body = (
      <PipelineLogsTable logs={logs} loading={loading} />
    );
  } else if (error) {
    body = (
      <div className="h-full flex items-center justify-center px-4">
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      </div>
    );
  } else if (!logs) {
    body = (
      <div className="h-full flex items-center justify-center text-sm text-gray-600 dark:text-slate-400">
        No logs available.
      </div>
    );
  } else {
    body = (
      <PipelineLogsTable logs={logs} loading={loading} />
    );
  }

  return (
    <section className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100 tracking-tight">Logs</h2>
          <p className="text-[11px] text-gray-600 dark:text-slate-400">Structured APM-style logs table with semantic level highlighting.</p>
        </div>
      </div>
      <div className="flex-1 p-3">
        {body}
      </div>
    </section>
  );
}

const LogsViewer = memo(LogsViewerInner);

export default LogsViewer;
