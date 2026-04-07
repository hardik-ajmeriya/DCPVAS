import React from 'react';
import Skeleton from '../ui/Skeleton';

function FailureRow() {
  return (
    <div className="grid grid-cols-5 gap-3 px-3 py-2.5">
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-3.5 w-16" />
    </div>
  );
}

function CompactCard() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-800/80 bg-white dark:bg-[var(--bg-secondary)] p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2 w-full">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export default function FailureListSkeleton({ variant = 'table', rows = 6 }) {
  if (variant === 'compact') {
    return (
      <div className="card-surface flex flex-col gap-3 h-auto">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: rows }).map((_, idx) => (
            <CompactCard key={idx} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface">
      <div className="flex items-center justify-between mb-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/50">
        <div className="grid grid-cols-5 gap-3 px-3 py-2 border-b border-gray-200 dark:border-white/10">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-3 w-16" />
          ))}
        </div>
        <div className="divide-y divide-gray-200 dark:divide-white/10">
          {Array.from({ length: rows }).map((_, idx) => (
            <FailureRow key={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}
