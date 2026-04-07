import { motion } from 'framer-motion';
import { Check, Circle } from 'lucide-react';

const STEP_SEQUENCE = [
  { key: 'fetching_logs', label: 'Fetching Logs' },
  { key: 'filtering_errors', label: 'Filtering Errors' },
  { key: 'ai_analyzing', label: 'AI Analyzing' },
  { key: 'storing_results', label: 'Storing Results' },
  { key: 'completed', label: 'Completed' },
];

function normalizeStep(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'object') {
    if (value.step) return String(value.step).trim().toLowerCase();
    if (value.current) return String(value.current).trim().toLowerCase();
  }
  return String(value).trim().toLowerCase();
}

function derivePipelineStatus(stepInput, pipelineStatus) {
  const fromStep = typeof stepInput === 'object' ? stepInput?.pipelineStatus || stepInput?.status : null;
  return String(pipelineStatus || fromStep || '').trim().toUpperCase();
}

function deriveActiveIndex(stepInput) {
  const normalized = normalizeStep(stepInput);
  const idx = STEP_SEQUENCE.findIndex((s) => s.key === normalized);
  return idx >= 0 ? idx : 0;
}

function computeStepStatus(index, activeIndex, isPipelineSuccess) {
  if (isPipelineSuccess) return 'success';
  if (index < activeIndex) return 'success';
  if (index === activeIndex) return 'running';
  return 'pending';
}

export default function PipelineProcessingSteps({ step, pipelineStatus, className = '' }) {
  const activeIndex = deriveActiveIndex(step);
  const isPipelineSuccess = derivePipelineStatus(step, pipelineStatus) === 'SUCCESS';
  const progressPct = isPipelineSuccess
    ? 100
    : Math.min(100, Math.max(0, (activeIndex / Math.max(STEP_SEQUENCE.length - 1, 1)) * 100));

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/60 backdrop-blur shadow-lg p-4 ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 via-slate-900/40 to-slate-950/60" aria-hidden />
      <div className="relative">
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[720px] px-1">
            <div className="relative flex items-center justify-between w-full">
              <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-slate-700/70 rounded-full" aria-hidden />
              <motion.div
                className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-r from-green-500 via-green-400 to-yellow-400"
                initial={{ width: '0%' }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
                aria-hidden
              />

              {STEP_SEQUENCE.map((s, idx) => {
                const status = computeStepStatus(idx, activeIndex, isPipelineSuccess);
                const icon = status === 'running'
                  ? <span className="h-3 w-3 rounded-full bg-yellow-300 animate-pulse" />
                  : status === 'success'
                  ? <Check className="w-5 h-5 text-green-300" />
                  : <Circle className="w-5 h-5 text-slate-200" />;

                const label = isPipelineSuccess && s.key === 'ai_analyzing'
                  ? 'AI Analyzing (Skipped)'
                  : s.label;

                return (
                  <div key={s.key} className="relative flex flex-col items-center gap-2 min-w-[110px]">
                    <motion.div
                      layout
                      className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 text-slate-100 bg-slate-900/85 border-slate-700/70 shadow-sm ${
                        status === 'running' ? 'ring-2 ring-yellow-200/70 shadow-yellow-200/30 animate-pulse' : ''
                      } ${status === 'success' ? 'bg-green-500/15 border-green-400 ring-1 ring-green-400/60 shadow-green-500/20' : ''}`}
                      initial={{ scale: 0.9, opacity: 0.95 }}
                      animate={{ scale: status === 'running' ? 1.08 : status === 'success' ? 1.04 : 1, opacity: 1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {icon}
                    </motion.div>
                    <div className="text-sm font-medium text-slate-100 text-center leading-tight">{label}</div>
                    {status === 'running' && (
                      <div className="text-[11px] text-yellow-100 bg-slate-900/90 border border-white/10 px-2 py-1 rounded-full shadow-lg shadow-black/30">
                        In progress
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
