import React, { memo, useMemo, useState } from 'react';
import LogsSkeleton from '../skeletons/LogsSkeleton';

function formatScore(score) {
  if (score == null || Number.isNaN(Number(score))) return null;
  let value = Number(score);
  if (value <= 1) value *= 100;
  if (value < 0) value = 0;
  if (value > 100) value = 100;
  return Math.round(value);
}

function Section({ title, data }) {
  const hasData =
    data != null &&
    (typeof data === 'string'
      ? data.trim().length > 0
      : Object.keys(data || {}).length > 0);

  return (
    <div className="mb-4 last:mb-0 bg-white dark:bg-white/5 rounded-xl p-3 border border-gray-200 dark:border-white/10 transition-all duration-200 ease-out">
      <h3 className="text-[10px] font-semibold tracking-wider text-gray-700 dark:text-gray-300 uppercase mb-1.5 flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
        {title}
      </h3>
      <div className="text-xs text-gray-700 dark:text-slate-200 leading-relaxed space-y-1.5">
        {!hasData && (
          <p className="text-gray-600 dark:text-slate-400">No data available.</p>
        )}
        {hasData && typeof data === 'string' && (
          <p>{data}</p>
        )}
        {hasData && typeof data === 'object' &&
          Object.entries(data).map(([key, value]) => (
            <p key={key} className="flex text-xs text-gray-700 dark:text-slate-200 leading-relaxed">
              <span className="font-semibold text-gray-900 dark:text-slate-100 mr-1">
                {key}:
              </span>
              <span className="text-gray-700 dark:text-slate-200">
                {String(value)}
              </span>
            </p>
          ))}
      </div>
    </div>
  );
}

function AIAnalysisPanelInner({ selectedBuild, buildData, loading, error }) {
  const score = useMemo(() => formatScore(buildData?.confidenceScore), [buildData?.confidenceScore]);
  const confidenceBarClass = useMemo(() => {
    if (score == null) return '';
    if (score > 80) return 'bg-emerald-400';
    if (score >= 50) return 'bg-yellow-400';
    return 'bg-red-400';
  }, [score]);

  const [showDetails, setShowDetails] = useState(false);
  const analysis = buildData || {};

  const hasAnalysis = useMemo(() => {
    if (!buildData) return false;
    return Boolean(
      buildData.detectedError ||
      buildData.humanSummary ||
      buildData.suggestedFix ||
      buildData.technicalRecommendation ||
      score != null,
    );
  }, [buildData, score]);

  let body = null;

  if (!selectedBuild) {
    body = (
      <div className="h-full flex items-center justify-center text-xs text-gray-600 dark:text-slate-400 text-center px-4">
        Select a build to analyze with AI.
      </div>
    );
  } else if (loading) {
    body = (
      <LogsSkeleton variant="analysis" />
    );
  } else if (error) {
    body = (
      <div className="h-full flex items-center justify-center px-4">
        <div className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      </div>
    );
  } else if (!hasAnalysis) {
    body = (
      <div className="h-full flex items-center justify-center text-xs text-gray-600 dark:text-slate-400 text-center px-4">
        Analysis not available.
      </div>
    );
  } else {
    const tldrText =
      analysis.detectedError ||
      analysis.humanSummary?.failureCause ||
      analysis.humanSummary?.overview ||
      null;

    const quickFixText = analysis.suggestedFix?.immediateActions || null;

    const handleCopyFix = async () => {
      if (!quickFixText) return;
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(quickFixText);
        }
      } catch {
        // fail silently; copy is a convenience feature
      }
    };

    body = (
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {tldrText && (
          <div className="rounded-xl border border-red-200 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-3 py-2.5 shadow-sm dark:shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all duration-200 ease-out">
            <div className="text-[11px] font-semibold text-red-800 dark:text-red-200 mb-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(248,113,113,0.9)]" />
              Issue Detected
            </div>
            <p className="text-xs text-red-700 dark:text-red-100 leading-relaxed">
              {tldrText}
            </p>
          </div>
        )}

        {quickFixText && (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2.5 flex flex-col gap-1.5 shadow-sm dark:shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all duration-200 ease-out">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                Quick Fix
              </div>
              <button
                type="button"
                onClick={handleCopyFix}
                className="text-[10px] px-2 py-1 rounded-lg bg-white dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-white/10 border border-emerald-400/60 text-emerald-700 dark:text-emerald-100 transition-all duration-200"
              >
                Copy Fix
              </button>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-100 leading-relaxed whitespace-pre-line">
              {quickFixText}
            </p>
          </div>
        )}

        {score != null && (
          <div className="rounded-xl border border-gray-200 dark:border-slate-700/60 bg-white dark:bg-slate-900/70 px-3 py-2.5 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-gray-800 dark:text-slate-300">Confidence Score</span>
              <span className="text-[11px] text-gray-900 dark:text-slate-200">{score}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full ${confidenceBarClass} shadow-[0_0_10px_rgba(148,163,184,0.8)] transition-all duration-500`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        )}

        {buildData?.analysisStatus && (
          <div className="text-[11px] text-gray-600 dark:text-slate-400">
            Status: <span className="text-cyan-300 font-medium">{buildData.analysisStatus}</span>
          </div>
        )}

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="text-[11px] px-3 py-1.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all duration-200"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {showDetails && (
          <div className="pt-2 space-y-4">
            <Section title="Human Summary" data={analysis.humanSummary} />
            <Section title="Suggested Fix" data={analysis.suggestedFix} />
            <Section title="Technical Recommendation" data={analysis.technicalRecommendation} />
          </div>
        )}
      </div>
    );
  }

  return (
    <aside className="h-full flex flex-col bg-white dark:bg-slate-950/80 border-l border-gray-200 dark:border-white/10">
      <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100 tracking-tight">AI Analysis</h2>
          <p className="text-[11px] text-gray-600 dark:text-slate-400">Summarized root cause and remediation hints.</p>
        </div>
      </div>
      {body}
    </aside>
  );
}

const AIAnalysisPanel = memo(AIAnalysisPanelInner);

export default AIAnalysisPanel;
