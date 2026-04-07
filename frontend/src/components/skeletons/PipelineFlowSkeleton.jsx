import Skeleton from '../ui/Skeleton.jsx';

export default function PipelineFlowSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-900/70 backdrop-blur-xl shadow-2xl">
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-indigo-500/10 dark:via-slate-800/30 dark:to-emerald-500/10" aria-hidden />
      <div className="relative p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>

        <div className="mt-4 space-y-4">
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex items-center justify-between gap-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 min-w-[110px]">
                <Skeleton className="h-14 w-14 rounded-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
