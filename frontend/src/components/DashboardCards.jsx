import React from 'react';
import MetricCard from './MetricCard.jsx';

export default function DashboardCards({ metrics, loading = false }) {
  const m = metrics || {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <MetricCard
        title="Pipelines"
        value={Number.isFinite(m.totalPipelines) ? m.totalPipelines : (loading ? '' : 0)}
        trend={undefined}
        color="indigo"
        icon="chart-line"
        loading={loading}
        series={[0.2,0.35,0.32,0.4,0.38,0.42]}
      />
      <MetricCard
        title="Active Builds"
        value={Number.isFinite(m.activeBuilds) ? m.activeBuilds : (loading ? '' : 0)}
        trend={undefined}
        color="cyan"
        icon="activity"
        loading={loading}
        series={[0.1,0.2,0.18,0.25,0.22,0.3]}
      />
      <MetricCard
        title="Failed Today"
        value={Number.isFinite(m.failedToday) ? m.failedToday : (loading ? '' : 0)}
        trend={undefined}
        color="red"
        icon="alert"
        loading={loading}
        series={[0.3,0.28,0.25,0.22,0.2,0.18]}
      />
      <MetricCard
        title="Avg Fix Time"
        value={typeof m.avgFixTime === 'string' && m.avgFixTime ? m.avgFixTime : (loading ? '' : '--')}
        trend={undefined}
        color="emerald"
        icon="clock"
        loading={loading}
        series={[0.5,0.48,0.45,0.42,0.4,0.38]}
      />
      <MetricCard
        title="AI Accuracy"
        value={Number.isFinite(m.aiAccuracy) ? `${m.aiAccuracy}%` : (loading ? '' : '--')}
        trend={undefined}
        color="violet"
        icon="brain"
        loading={loading}
        series={[0.6,0.62,0.64,0.66,0.68,0.7]}
      />
    </div>
  );
}
