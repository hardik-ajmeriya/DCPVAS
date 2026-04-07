import Skeleton from '../ui/Skeleton.jsx';

export default function CardsSkeleton({ count = 5 }) {
  const items = Array.from({ length: count });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {items.map((_, idx) => (
        <div
          key={idx}
          className="relative rounded-2xl p-6 bg-white dark:bg-slate-900/70 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none"
        >
          <div className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/5" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="mt-4 h-10 w-full">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
