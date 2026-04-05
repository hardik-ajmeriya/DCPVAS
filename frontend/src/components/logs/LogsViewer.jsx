import React, { memo, useEffect, useMemo, useRef } from 'react';

function getLogClass(line) {
  if (!line) return 'text-gray-300';
  const upper = line.toUpperCase();

  if (upper.includes('ERROR') || upper.includes('FAIL')) {
    return 'bg-red-500/10 text-red-400 px-1 rounded';
  }
  if (upper.includes('SUCCESS')) {
    return 'text-green-400';
  }
  if (upper.includes('WARN')) {
    return 'text-yellow-400';
  }
  return 'text-gray-300';
}

function LogsViewerInner({ logs, loading, hasSelectedBuild, error }) {
  const containerRef = useRef(null);

  const lines = useMemo(() => {
    if (!logs) return [];
    return logs.split('\n');
  }, [logs]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  let body = null;

  if (!hasSelectedBuild) {
    body = (
      <div className="h-full flex items-center justify-center text-sm text-slate-400">
        Select a build to view logs.
      </div>
    );
  } else if (loading) {
    body = (
      <div className="h-full flex items-center justify-center text-sm text-slate-300">
        Loading logs...
      </div>
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
      <pre
        ref={containerRef}
        className="h-full w-full overflow-auto bg-slate-950/80 text-xs md:text-sm font-mono text-gray-300 leading-relaxed px-4 py-3 border border-white/10 rounded-2xl"
      >
        {lines.map((line, idx) => (
          <div key={idx} className={getLogClass(line)}>
            {line || '\u00A0'}
          </div>
        ))}
      </pre>
    );
  }

  return (
    <section className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100 tracking-tight">Logs</h2>
          <p className="text-[11px] text-gray-600 dark:text-slate-400">Stream-style console view with semantic coloring.</p>
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
