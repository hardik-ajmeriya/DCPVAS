import Skeleton from '../ui/Skeleton.jsx';

export default function InsightsSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-emerald-400/60" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-900/70 p-5 shadow-sm dark:shadow-lg"
          >
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
