import React, { memo, useMemo } from 'react';
import PipelineListSkeleton from '../skeletons/PipelineListSkeleton';

function getStatusClasses(status) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border';
  switch (status) {
    case 'SUCCESS':
      return `${base} bg-emerald-500/10 text-emerald-300 border-emerald-400/40`;
    case 'FAILURE':
      return `${base} bg-red-500/10 text-red-300 border-red-400/40`;
    case 'RUNNING':
      return `${base} bg-sky-500/10 text-sky-300 border-sky-400/40`;
    default:
      return `${base} bg-slate-500/10 text-slate-300 border-slate-400/40`;
  }
}

function formatExecutedAt(executedAt) {
  if (!executedAt) return 'Unknown time';
  const d = new Date(executedAt);
  if (Number.isNaN(d.getTime())) return 'Unknown time';
  return d.toLocaleString();
}

function BuildListInner({ builds, selectedBuild, onSelectBuild, loading, error }) {
  const hasBuilds = Array.isArray(builds) && builds.length > 0;

  const content = useMemo(() => {
    if (loading) {
      return <PipelineListSkeleton variant="sidebar" rows={8} />;
    }

    if (error) {
      return (
        <div className="text-sm text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      );
    }

    if (!hasBuilds) {
      return (
        <div className="text-sm text-gray-600 dark:text-slate-400">
          No builds found yet. Trigger a pipeline run to see logs.
        </div>
      );
    }

    return (
      <ul className="space-y-1 px-2 py-2">
        {builds.map((build) => {
          const buildNumber = Number(build.buildNumber);
          const isSelected = selectedBuild === buildNumber;
          const status = build.status || 'UNKNOWN';

          return (
            <li
              key={buildNumber}
              className={[
                'group rounded-xl border px-3 py-2.5 text-xs cursor-pointer',
                'transition-all duration-200 ease-in-out hover:scale-[1.02] hover:bg-gray-50 dark:hover:bg-white/10',
                'bg-white dark:bg-slate-950/60 border-gray-200 dark:border-white/5',
                isSelected ? 'ring-1 ring-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.3)] border-blue-400/60 bg-slate-900/80' : '',
              ].join(' ')}
              onClick={() => onSelectBuild(buildNumber)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-gray-900 dark:text-slate-100">Build #{buildNumber}</div>
                <span className={getStatusClasses(status)}>{status}</span>
              </div>
              <div className="mt-1 text-[11px] text-gray-600 dark:text-slate-400">
                {build.jobName ? `${build.jobName} • ` : ''}
                {formatExecutedAt(build.executedAt)}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }, [builds, error, hasBuilds, loading, onSelectBuild, selectedBuild]);

  return (
    <aside className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100 tracking-tight">Builds</h2>
          <p className="text-[11px] text-gray-600 dark:text-slate-400">Select a build to inspect its logs.</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
        {content}
      </div>
    </aside>
  );
}

const BuildList = memo(BuildListInner);

export default BuildList;
