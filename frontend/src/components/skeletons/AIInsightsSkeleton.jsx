import React from 'react';
import Skeleton from '../ui/Skeleton';

function MetricCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-5 shadow-sm space-y-3">
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

function PanelSkeleton({ lines = 5 }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-4 shadow-sm space-y-3">
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton key={idx} className={`h-3 ${idx % 3 === 0 ? 'w-full' : idx % 2 === 0 ? 'w-4/5' : 'w-5/6'}`} />
      ))}
    </div>
  );
}

export default function AIInsightsSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-3 w-28" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <MetricCardSkeleton key={idx} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PanelSkeleton lines={8} />
        <PanelSkeleton lines={7} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PanelSkeleton lines={9} />
        <PanelSkeleton lines={6} />
      </div>
    </div>
  );
}
