export default function Skeleton({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-200/80 dark:bg-slate-800/70 animate-pulse ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10 opacity-60" />
    </div>
  );
}
