import React from 'react';
import Skeleton from '../ui/Skeleton';

function BuildsPaneSkeleton() {
  return (
    <div className="space-y-2 px-2 py-2">
      {Array.from({ length: 8 }).map((_, idx) => (
        <div key={idx} className="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-3 space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

function ViewerPaneSkeleton() {
  return (
    <div className="h-full rounded-2xl border border-white/10 bg-slate-950/70 p-4 space-y-2">
      {Array.from({ length: 16 }).map((_, idx) => (
        <Skeleton key={idx} className={`h-3 ${idx % 4 === 0 ? 'w-11/12' : idx % 3 === 0 ? 'w-4/5' : 'w-full'}`} />
      ))}
    </div>
  );
}

function AnalysisPaneSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-full rounded-full" />
      </div>
      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export default function LogsSkeleton({ variant = 'page' }) {
  if (variant === 'builds') return <BuildsPaneSkeleton />;
  if (variant === 'viewer') return <ViewerPaneSkeleton />;
  if (variant === 'analysis') return <AnalysisPaneSkeleton />;

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-72" />
        </div>
      </div>
      <div className="flex flex-1 min-h-0 gap-3 overflow-hidden">
        <div className="w-full md:w-1/4 lg:w-1/5 min-h-0 rounded-2xl border border-white/10 bg-white/5">
          <BuildsPaneSkeleton />
        </div>
        <div className="flex-1 min-h-0 rounded-2xl border border-white/10 bg-white/5 p-3">
          <ViewerPaneSkeleton />
        </div>
        <div className="w-1/4 min-h-0 hidden md:block rounded-2xl border border-white/10 bg-white/5">
          <AnalysisPaneSkeleton />
        </div>
      </div>
    </div>
  );
}
