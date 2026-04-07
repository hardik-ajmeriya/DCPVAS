import React from 'react';
import Skeleton from '../ui/Skeleton';

export default function DashboardCardSkeleton() {
  return (
    <div className="relative rounded-2xl p-6 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800/80 shadow-sm">
      <Skeleton className="absolute top-4 right-4 h-9 w-9 rounded-lg" />

      <div className="space-y-2.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-14" />
      </div>

      <div className="mt-4 h-10 rounded-lg">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    </div>
  );
}
