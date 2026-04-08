import { memo } from 'react';
import { CheckCircle, CloudDownload, Filter, Brain, Database } from 'lucide-react';

const STEPS = [
  { key: 'fetch_logs', label: 'Fetching Logs', icon: CloudDownload },
  { key: 'filter_errors', label: 'Filtering Errors', icon: Filter },
  { key: 'ai_analysis', label: 'AI Analyzing', icon: Brain },
  { key: 'store_results', label: 'Storing Results', icon: Database },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
];

const ORDER = {
  fetch_logs: 1,
  filter_errors: 2,
  ai_analysis: 3,
  store_results: 4,
  completed: 5,
  skipped: 5,
};

function AnalysisStatusBar({ data = null, stage = 'fetch_logs', skipped = false, className = '' }) {
  const source = data && typeof data === 'object' ? data : null;
  const derivedStage = source?.aiStatus?.stage ?? source?.stage ?? stage;
  const derivedSkipped = source?.aiStatus?.skipped ?? source?.skipped ?? skipped;
  const normalizedStage = derivedStage?.toLowerCase?.() || 'fetch_logs';
  const current = ORDER[normalizedStage] || 1;
  const isSkipped = Boolean(derivedSkipped) || normalizedStage === 'skipped';
  const isTerminal = normalizedStage === 'completed' || isSkipped;

  if (!source && !stage) {
    return (
      <div className={`rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 shadow-lg ${className}`}>
        <div className="h-4 w-40 rounded bg-gray-200 dark:bg-slate-700 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 shadow-lg ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">AI Analysis Status</div>
        <div className="text-xs text-gray-600 dark:text-slate-400 capitalize">
          {isSkipped ? 'AI analysis skipped (pipeline successful)' : (normalizedStage || 'pending')}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {STEPS.map((step) => {
          const order = ORDER[step.key];
          const Icon = step.icon;
          const skippedStep = step.key === 'ai_analysis' && isSkipped;
          const terminalDone = isTerminal && (order <= ORDER.completed);
          const isDone = terminalDone || skippedStep || order < current || (order === current && (step.key === 'completed' || step.key === 'store_results') && !isSkipped);
          const isRunning = !isTerminal && order === current && !isDone && !skippedStep;
          const icon = isRunning
            ? <span className="h-3 w-3 rounded-full bg-amber-400 animate-pulse" />
            : <Icon className={`w-5 h-5 ${isDone ? 'text-emerald-500 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-200'}`} />;

          return (
            <div key={step.key} className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-slate-800/70 bg-gray-50 dark:bg-slate-800/50 px-3 py-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDone ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-400/40' : 'bg-white dark:bg-slate-900/70 border border-gray-200 dark:border-slate-700/70'}`}>
                {icon}
              </div>
              <div className="text-sm text-gray-900 dark:text-slate-100">{skippedStep ? 'AI Analysis Skipped' : (isTerminal && step.key === 'completed' && isSkipped ? 'Skipped' : step.label)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(AnalysisStatusBar);
