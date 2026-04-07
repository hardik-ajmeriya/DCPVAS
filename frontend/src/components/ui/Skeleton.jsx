import React from 'react';

export default function Skeleton({ as: Component = 'div', className = '', ...props }) {
  return (
    <Component
      aria-hidden="true"
      className={`skeleton relative overflow-hidden rounded-md bg-slate-700/40 dark:bg-slate-800 border border-slate-600/30 dark:border-slate-700/40 ${className}`}
      {...props}
    />
  );
}
