import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Brain, CheckCircle2 } from 'lucide-react';
import { getAIInsights } from '../services/api.js';
import InsightsSkeleton from '../components/skeletons/InsightsSkeleton.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';

function InsightCard({ title, value, accent, onClick, subtitle }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-gradient-to-br ${accent} p-5 shadow-sm dark:shadow-lg transition-all duration-200 hover:shadow-md dark:hover:shadow-lg hover:scale-[1.01] ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="text-sm text-gray-600 dark:text-slate-200/80">{title}</div>
      <div className="text-3xl font-semibold text-gray-900 dark:text-white mt-2 underline-offset-4 hover:underline" aria-label={title}>
        {value}
      </div>
      {subtitle && <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">{subtitle}</div>}
    </div>
  );
}

function FailureTrendChart({ data }) {
  const [recharts, setRecharts] = useState(null);
  const maxFailures = useMemo(() => (data.length ? Math.max(...data.map((d) => Number(d.failures) || 0)) : 0), [data]);

  useEffect(() => {
    let mounted = true;
    import('recharts').then((mod) => {
      if (mounted) setRecharts(mod);
    });
    return () => { mounted = false; };
  }, []);

  if (!recharts) {
    return (
      <div className="h-64 rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-900/60 p-4 space-y-3">
        <Skeleton className="h-4 w-40" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Skeleton key={idx} className={`h-3 ${idx % 2 === 0 ? 'w-full' : 'w-5/6'}`} />
          ))}
        </div>
      </div>
    );
  }

  const { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } = recharts;

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-lg">
        <div className="text-sm font-semibold text-gray-900 dark:text-slate-200 mb-3">Pipeline Failures (Last 7 Days)</div>
        <div className="h-[260px] flex items-center justify-center text-sm text-gray-600 dark:text-slate-400">
          No failures recorded in the last 7 days.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-lg">
      <div className="text-sm font-semibold text-gray-900 dark:text-slate-200 mb-3">Pipeline Failures (Last 7 Days)</div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 16, left: 0, bottom: 12 }}
          padding={{ left: 20, right: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={{ stroke: '#d1d5db' }}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            tickMargin={14}
            interval={0}
          />
          <YAxis allowDecimals={false} stroke="rgba(209,213,219,1)" tickLine={false} axisLine={false} width={28} tick={{ fill: '#6b7280', fontSize: 11 }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              const entry = payload[0]?.payload;
              return (
                <div className="rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 shadow-xl shadow-black/40">
                  <div className="font-semibold">{label}</div>
                  <div className="text-slate-300">Failures: {entry?.failures ?? 0}</div>
                  {entry?.topIssue && <div className="text-gray-600 dark:text-slate-400">Top Issue: {entry.topIssue}</div>}
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="failures"
            stroke="#7c3aed"
            strokeWidth={2.5}
            dot={{
              r: 3,
              strokeWidth: 1,
              stroke: '#c084fc',
              fill: '#c084fc',
            }}
            activeDot={(props) => {
              const { cx, cy, payload } = props;
              const isPeak = payload?.failures === maxFailures;
              return (
                <g>
                  <circle cx={cx} cy={cy} r={isPeak ? 7 : 5} fill={isPeak ? '#a855f7' : '#c084fc'} stroke="#c084fc" strokeWidth={isPeak ? 2 : 1} filter={isPeak ? 'drop-shadow(0 0 6px rgba(168,85,247,0.7))' : undefined} />
                </g>
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function StageReliability({ stages }) {
  const colorForRate = (rate) => {
    if (rate >= 95) return 'bg-emerald-500';
    if (rate >= 85) return 'bg-yellow-400';
    return 'bg-red-500';
  };

  if (!stages.length) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-lg">
        <div className="text-sm font-semibold text-gray-900 dark:text-slate-200">Stage Reliability</div>
        <div className="text-sm text-gray-600 dark:text-slate-400 mt-3">No stage reliability data available yet.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-slate-200">Stage Reliability</div>
          <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">Success rate based on last 50 builds</div>
        </div>
        <div className="text-xs text-gray-600 dark:text-slate-400">Success rate by stage</div>
      </div>
      <div className="space-y-3">
        {stages.map((stage) => (
          <div key={stage.name} className="space-y-1" title={`${stage.name} — Success Rate: ${stage.rate}% • Failures: ${stage.failures ?? 0}`}>
            <div className="flex items-center justify-between text-sm text-gray-700 dark:text-slate-200">
              <span>{stage.name}</span>
              <span className="text-gray-500 dark:text-slate-300">{stage.rate}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className={`${colorForRate(stage.rate)} h-2 rounded-full transition-all duration-700 ease-out`} style={{ width: `${Math.min(stage.rate, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AISuggestions({ items }) {
  const normalized = Array.isArray(items)
    ? items
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          if (typeof item.fix === 'string' && item.fix.trim()) return item.fix.trim();
          if (typeof item.title === 'string' && item.title.trim()) return item.title.trim();
        }
        return '';
      })
      .filter(Boolean)
    : [];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-purple-500/20 bg-white dark:bg-slate-900/60 p-5 shadow-sm dark:shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-purple-500 dark:text-purple-300" />
        <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">AI Suggestions</div>
      </div>
      {normalized.length ? (
        <ul className="space-y-2 list-disc pl-5 text-sm text-gray-700 dark:text-slate-300">
          {normalized.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-gray-600 dark:text-slate-400">No actionable suggestions yet.</div>
      )}
    </div>
  );
}

function AISummary({ text }) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-900/60 p-4 shadow-sm dark:shadow-lg">
      <div className="text-sm font-semibold text-gray-900 dark:text-slate-200 mb-2">AI Summary</div>
      <p className="text-sm text-gray-700 dark:text-slate-400 leading-relaxed max-w-3xl">{text}</p>
    </div>
  );
}

export default function AIInsights() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(0);

  const metrics = useMemo(() => {
    if (!insights) return [];
    const stabilityValue = Number.isFinite(insights.stability) ? `${insights.stability}%` : '—';
    const aiConfidenceValue = Number.isFinite(insights.aiConfidence) ? `${insights.aiConfidence}%` : '—';
    const mostFailingStageValue = insights.mostFailingStage || 'Unknown';

    return [
      {
        title: 'Pipeline Stability',
        value: stabilityValue,
        accent: 'from-emerald-500/20 via-slate-900 to-emerald-600/10',
        subtitle: insights.totalRuns
          ? `Based on last ${insights.totalRuns} runs`
          : 'No recent runs available',
      },
      {
        title: 'Most Failing Stage',
        value: mostFailingStageValue,
        accent: 'from-amber-500/15 via-slate-900 to-red-500/10',
        subtitle: 'Click to filter failures',
      },
      {
        title: 'AI Confidence',
        value: aiConfidenceValue,
        accent: 'from-indigo-500/20 via-slate-900 to-purple-600/10',
        subtitle: 'Model confidence across recent runs',
      },
    ];
  }, [insights]);

  const failureTrend = useMemo(() => insights?.failuresTrend || [], [insights]);
  const stageReliability = useMemo(() => insights?.stageStats || [], [insights]);
  const aiSuggestions = useMemo(() => insights?.suggestions || [], [insights]);
  const aiSummary = useMemo(() => insights?.summary || '', [insights]);

  const mostFailingStage = insights?.mostFailingStage || null;

  const hasInsights = Boolean(!loading && insights && insights.totalRuns > 0);

  useEffect(() => {
    let mounted = true;

    const fetchInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAIInsights();
        if (mounted) {
          setInsights(data);
          setLastUpdated(0);
        }
      } catch (err) {
        console.error('Failed to fetch AI insights', err?.message || err);
        if (mounted) setError('Failed to load AI insights.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchInsights();

    const timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 8000);

    const timer = setInterval(() => {
      setLastUpdated((prev) => prev + 10);
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(timer);
      clearTimeout(timeoutId);
    };
  }, []);

  if (loading && !insights) {
    return <InsightsSkeleton />;
  }

  if (!loading && (!hasInsights || error)) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-900/60 p-6 flex items-center gap-3 text-gray-700 dark:text-slate-300">
          <AlertCircle className="w-5 h-5 text-amber-400" />
          <div className="space-y-1">
            <div className="font-medium text-gray-900 dark:text-slate-100">No AI insights available yet.</div>
            <div className="text-sm text-gray-700 dark:text-slate-400">Run completed pipelines to generate insights from real build data.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div className="text-xl font-semibold text-gray-900 dark:text-white">AI Insights</div>
        </div>
        <div className="text-xs text-gray-600 dark:text-slate-400">
          {loading ? 'Loading…' : `Last Updated ${lastUpdated}s ago`}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-300/40 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <InsightCard
            key={m.title}
            title={m.title}
            value={m.value}
            accent={m.accent}
            subtitle={m.subtitle}
            onClick={
              m.title === 'Most Failing Stage' && mostFailingStage
                ? () => navigate(`/failures?stage=${encodeURIComponent(String(mostFailingStage).toLowerCase().replace(/\s+/g, '-'))}`)
                : undefined
            }
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FailureTrendChart data={failureTrend} />
        <StageReliability stages={stageReliability} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AISuggestions items={aiSuggestions} />
        <AISummary text={aiSummary} />
      </div>
    </div>
  );
}
