import Skeleton from '../ui/Skeleton.jsx';

export default function LogsSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 gap-3 overflow-hidden">
      <div className="w-full md:w-1/4 lg:w-1/5 min-h-0 h-full overflow-y-auto">
        <div className="min-h-full bg-white dark:bg.white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_0_20px_rgba(0,0,0,0.3)] rounded-2xl p-4 space-y-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-6 w-full" />
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 h-full overflow-y-auto">
        <div className="min-h-full bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_0_20px_rgba(0,0,0,0.3)] rounded-2xl p-4 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-40" />
          {Array.from({ length: 8 }).map((_, idx) => (
            <Skeleton key={idx} className="h-4 w-full" />
          ))}
        </div>
      </div>

      <div className="w-1/4 min-h-0 h-full overflow-y-auto hidden md:block">
        <div className="min-h-full bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_0_20px_rgba(0,0,0,0.3)] rounded-2xl p-4 space-y-3">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
