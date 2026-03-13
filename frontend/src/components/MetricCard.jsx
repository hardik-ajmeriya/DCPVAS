import React from 'react';

const COLOR_THEMES = {
  indigo: {
    gradient: 'bg-gradient-to-br from-indigo-500/20 to-purple-500/10',
    border: 'border-indigo-400/30',
    iconColor: 'text-indigo-400',
    strokeClass: 'text-indigo-400',
  },
  cyan: {
    gradient: 'bg-gradient-to-br from-cyan-500/20 to-blue-500/10',
    border: 'border-cyan-400/30',
    iconColor: 'text-cyan-400',
    strokeClass: 'text-cyan-400',
  },
  red: {
    gradient: 'bg-gradient-to-br from-red-500/20 to-pink-500/10',
    border: 'border-red-400/30',
    iconColor: 'text-red-400',
    strokeClass: 'text-red-400',
  },
  emerald: {
    gradient: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10',
    border: 'border-emerald-400/30',
    iconColor: 'text-emerald-400',
    strokeClass: 'text-emerald-400',
  },
  violet: {
    gradient: 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10',
    border: 'border-violet-400/30',
    iconColor: 'text-violet-400',
    strokeClass: 'text-violet-400',
  },
};

function Icon({ name, className }) {
  switch (name) {
    case 'chart-line':
    case 'chart':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3v18h18" strokeLinecap="round" />
          <path d="M6 15l4-5 4 3 5-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'activity':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 12h4l3 7 4-14 3 7h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'alert':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 9v4" strokeLinecap="round" />
          <path d="M12 17h.01" strokeLinecap="round" />
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      );
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'brain':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 7a3 3 0 10-3 3" />
          <path d="M8 7a3 3 0 013-3" />
          <path d="M16 7a3 3 0 013-3" />
          <path d="M16 7a3 3 0 103 3" />
          <path d="M5 10a5 5 0 005 5h4a5 5 0 005-5" />
        </svg>
      );
    default:
      return null;
  }
}

export default function MetricCard({
  title,
  value,
  trend, // string like "+12%" or "-3%"
  color = 'indigo',
  icon = 'chart-line',
  loading = false,
  series = [], // numbers 0..1 for subtle line chart
}) {
  const theme = COLOR_THEMES[color] || COLOR_THEMES.indigo;
  const trendColor = typeof trend === 'string' && trend.trim().startsWith('-') ? 'text-red-400' : 'text-green-400';

  const points = (() => {
    const arr = Array.isArray(series) && series.length > 1 ? series : [0.3, 0.35, 0.33, 0.38, 0.36, 0.4];
    const n = arr.length - 1;
    return arr.map((v, i) => `${(i / n) * 100},${20 - v * 18}`).join(' ');
  })();

  return (
    <div
      className={`relative rounded-2xl p-6 ${theme.gradient} border ${theme.border} shadow-lg backdrop-blur transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-xl`}
    >
      {/* Icon */}
      <div className={`absolute top-4 right-4 w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center transition-all duration-300 ease-out hover:brightness-110 ${theme.iconColor}`}>
        <Icon name={icon} className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="space-y-1">
        <div className="text-sm text-gray-400">{title}</div>
        <div className="text-3xl font-bold text-white">
          {loading ? (
            <span className="inline-block w-20 h-8 rounded bg-white/10 animate-pulse" />
          ) : (
            <span>{value}</span>
          )}
        </div>
        {typeof trend === 'string' && trend.length > 0 && (
          <div className={`text-xs ${trendColor}`}>{trend}</div>
        )}
      </div>

      {/* Subtle line chart */}
      <div className="mt-4 h-10 w-full">
        <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="currentColor"
            className={theme.strokeClass}
            strokeWidth="1.5"
            points={points}
          />
        </svg>
      </div>
    </div>
  );
}
