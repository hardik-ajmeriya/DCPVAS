<<<<<<< HEAD
import React from 'react';

export default function Skeleton({ as: Component = 'div', className = '', ...props }) {
  return (
    <Component
      aria-hidden="true"
      className={`skeleton relative overflow-hidden rounded-md bg-slate-700/40 dark:bg-slate-800 border border-slate-600/30 dark:border-slate-700/40 ${className}`}
      {...props}
    />
=======
export default function Skeleton({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-200/80 dark:bg-slate-800/70 animate-pulse ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10 opacity-60" />
    </div>
>>>>>>> 526fa79 (fix: scalaton loading & jenkins config)
  );
}
