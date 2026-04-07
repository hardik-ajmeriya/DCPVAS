import React from 'react';
import Skeleton from '../ui/Skeleton';

function TableRow() {
  return (
    <div className="grid grid-cols-6 gap-3 px-3 py-2.5">
      <Skeleton className="h-3.5 w-full col-span-2" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-20" />
    </div>
  );
}

function SidebarRow() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-950/60 px-3 py-3 space-y-2">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

function BuildCard() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-800/80 border-l-4 border-l-slate-500 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-5 w-14" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-7 w-14 rounded-md" />
      </div>
    </div>
  );
}

export default function PipelineListSkeleton({ variant = 'table', rows = 6, title = true }) {
  if (variant === 'sidebar') {
    return (
      <div className="space-y-2 px-2 py-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <SidebarRow key={idx} />
        ))}
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <BuildCard key={idx} />
        ))}
      </div>
    );
  }

  return (
    <div className="card-surface">
      {title && (
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-36" />
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/50">
        <div className="grid grid-cols-6 gap-3 px-3 py-2 border-b border-gray-200 dark:border-white/10">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-3 w-14" />
          ))}
        </div>
        <div className="divide-y divide-gray-200 dark:divide-white/10">
          {Array.from({ length: rows }).map((_, idx) => (
            <TableRow key={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}
