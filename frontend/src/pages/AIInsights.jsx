import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Brain, CheckCircle2 } from 'lucide-react';

function InsightCard({ title, value, accent, onClick, subtitle }) {
  return (
    <div
      className={`rounded-2xl border border-white/5 bg-gradient-to-br ${accent} p-5 shadow-lg transition-all duration-200 hover:shadow-lg hover:scale-[1.01] ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="text-sm text-slate-200/80">{title}</div>
      <div className="text-3xl font-semibold text-white mt-2 underline-offset-4 hover:underline" aria-label={title}>
        {value}
      </div>
      {subtitle && <div className="text-xs text-slate-400 mt-2">{subtitle}</div>}
    </div>
  );
}

function FailureTrendChart({ data }) {
  const [recharts, setRecharts] = useState(null);
  const maxFailures = useMemo(() => Math.max(...data.map((d) => d.failures)), [data]);

  useEffect(() => {
    let mounted = true;
    import('recharts').then((mod) => {
      if (mounted) setRecharts(mod);
    });
    return () => { mounted = false; };
  }, []);

  if (!recharts) {
    return (
      <div className="h-64 rounded-2xl border border-white/5 bg-slate-900/60 flex items-center justify-center text-xs text-slate-400">
        Loading chart…
      </div>
    );
  }

  const { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } = recharts;
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 shadow-lg">
      <div className="text-sm text-slate-200 mb-3 font-semibold">Pipeline Failures (Last 7 Days)</div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 16, left: 0, bottom: 12 }}
          padding={{ left: 20, right: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={{ stroke: '#1f2937' }}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickMargin={14}
            interval={0}
          />
          <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.6)" tickLine={false} axisLine={false} width={28} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              const entry = payload[0]?.payload;
              return (
                <div className="rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 shadow-xl shadow-black/40">
                  <div className="font-semibold">{label}</div>
                  <div className="text-slate-300">Failures: {entry?.failures ?? 0}</div>
                  {entry?.topIssue && <div className="text-slate-400">Top Issue: {entry.topIssue}</div>}
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

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-200">Stage Reliability</div>
          <div className="text-xs text-slate-400 mt-1">Success rate based on last 50 builds</div>
        </div>
        <div className="text-xs text-slate-400">Success rate by stage</div>
      </div>
      <div className="space-y-3">
        {stages.map((stage) => (
          <div key={stage.name} className="space-y-1" title={`${stage.name} — Success Rate: ${stage.rate}% • Failures: ${stage.failures ?? 0}`}>
            <div className="flex items-center justify-between text-sm text-slate-200">
              <span>{stage.name}</span>
              <span className="text-slate-300">{stage.rate}%</span>
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
  return (
    <div className="rounded-2xl border border-purple-500/20 bg-slate-900/60 p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-purple-300" />
        <div className="text-sm font-semibold text-slate-100">AI Suggestions</div>
      </div>
      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={idx} className="border-l-2 border-purple-500/40 pl-3 space-y-2">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Issue</div>
              <div className="text-sm text-slate-100 font-medium">{item.title}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Possible Causes</div>
              <ul className="list-disc pl-4 text-xs text-slate-300 space-y-1 mt-1">
                {item.causes.map((cause, i) => <li key={i}>{cause}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">Suggested Fix</div>
              <div className="text-xs text-slate-200 mt-1">{item.fix}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AISummary({ text }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 shadow-lg">
      <div className="text-sm font-semibold text-slate-200 mb-2">AI Summary</div>
      <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">{text}</p>
    </div>
  );
}

export default function AIInsights() {
  const navigate = useNavigate();
  const metrics = useMemo(() => ([
    { title: 'Pipeline Stability', value: '82%', accent: 'from-emerald-500/20 via-slate-900 to-emerald-600/10', subtitle: 'Based on last 50 builds' },
    { title: 'Most Failing Stage', value: 'Docker Build', accent: 'from-amber-500/15 via-slate-900 to-red-500/10', subtitle: 'Click to filter failures' },
    { title: 'AI Confidence', value: '92%', accent: 'from-indigo-500/20 via-slate-900 to-purple-600/10', subtitle: 'Model confidence across recent runs' },
  ]), []);

  const failureTrend = useMemo(() => ([
    { day: 'Mon', failures: 2, topIssue: 'Docker Build' },
    { day: 'Tue', failures: 1, topIssue: 'Unit Test' },
    { day: 'Wed', failures: 4, topIssue: 'Docker Build' },
    { day: 'Thu', failures: 0, topIssue: null },
    { day: 'Fri', failures: 3, topIssue: 'Deploy' },
    { day: 'Sat', failures: 1, topIssue: 'Unit Test' },
    { day: 'Sun', failures: 2, topIssue: 'Docker Build' },
  ]), []);

  const stageReliability = useMemo(() => ([
    { name: 'Checkout', rate: 100, failures: 0 },
    { name: 'Build', rate: 95, failures: 2 },
    { name: 'Unit Test', rate: 82, failures: 7 },
    { name: 'Docker Build', rate: 61, failures: 19 },
    { name: 'Deploy', rate: 90, failures: 4 },
  ]), []);

  const aiSuggestions = useMemo(() => ([
    {
      title: 'Docker Build failures detected frequently',
      causes: ['Docker login token expired', 'Base image pulls timing out', 'Layer cache not reused in CI nodes'],
      fix: 'Run docker login before the build stage and enable remote layer caching to reduce pull retries.',
    },
    {
      title: 'Intermittent test flakiness in Unit Test stage',
      causes: ['Race conditions in async tests', 'Shared test database between jobs'],
      fix: 'Isolate test databases per job and add retry logic for known flaky suites.',
    },
  ]), []);

  const aiSummary = useMemo(() => (
    'Most failures this week occurred during Docker Build due to image pulls and auth issues. Test reliability improved compared to last week, while deploys remained stable.'
  ), []);

  const hasInsights = Boolean(failureTrend.length && stageReliability.length && aiSuggestions.length);

  const [lastUpdated, setLastUpdated] = useState(0);

  useEffect(() => {
    setLastUpdated(0);
    const timer = setInterval(() => {
      setLastUpdated((prev) => prev + 10);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  if (!hasInsights) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 flex items-center gap-3 text-slate-300">
          <AlertCircle className="w-5 h-5 text-amber-400" />
          <div className="space-y-1">
            <div className="font-medium text-slate-100">No AI insights available yet.</div>
            <div className="text-sm text-slate-400">Run more pipelines to generate analytics.</div>
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
          <div className="text-xl font-semibold text-white">AI Insights</div>
        </div>
        <div className="text-xs text-slate-400">Last Updated {lastUpdated}s ago</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <InsightCard
            key={m.title}
            title={m.title}
            value={m.value}
            accent={m.accent}
            subtitle={m.subtitle}
            onClick={m.title === 'Most Failing Stage' ? () => navigate('/failures?stage=docker-build') : undefined}
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
