import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import {
  Check,
  Circle,
  Container,
  FlaskConical,
  GitBranch,
  Hammer,
  Rocket,
  X,
} from 'lucide-react';
import Skeleton from './ui/Skeleton';

const JENKINS_BASE = import.meta.env.VITE_JENKINS_BASE_URL || '';

const STATUS_META = {
  success: {
    label: 'SUCCESS',
    dot: 'bg-green-500',
    text: 'text-emerald-600 dark:text-green-200',
    shadow: 'shadow-green-500/40',
    chip: 'bg-green-500/15 text-green-200 border border-green-500/25',
    ring: 'ring-green-400/40',
  },
  failed: {
    label: 'FAILED',
    dot: 'bg-red-500',
    text: 'text-red-600 dark:text-red-200',
    shadow: 'shadow-red-500/40',
    chip: 'bg-red-500/15 text-red-200 border border-red-500/25',
    ring: 'ring-red-400/35',
  },
  running: {
    label: 'RUNNING',
    dot: 'bg-yellow-400',
    text: 'text-amber-600 dark:text-yellow-100',
    shadow: 'shadow-yellow-400/40',
    chip: 'bg-yellow-400/15 text-yellow-100 border border-yellow-300/30',
    ring: 'ring-yellow-300/40',
  },
  pending: {
    label: 'PENDING',
    dot: 'bg-gray-600',
    text: 'text-gray-600 dark:text-gray-300',
    shadow: 'shadow-gray-500/30',
    chip: 'bg-gray-600/15 text-gray-300 border border-gray-500/20',
    ring: 'ring-gray-400/30',
  },
};

function normalizeStatus(status) {
  const value = String(status || 'pending').trim().toLowerCase();
  if (['in_progress', 'inprogress', 'running', 'paused_pending_input', 'paused'].includes(value)) return 'running';
  if (['failed', 'failure', 'aborted', 'unstable'].includes(value)) return 'failed';
  if (['success', 'succeeded', 'passed'].includes(value)) return 'success';
  if (['not_executed', 'not-executed', 'skipped', 'pending', 'queued'].includes(value)) return 'pending';
  return 'pending';
}

function formatDuration(ms) {
  if (typeof ms !== 'number' || Number.isNaN(ms) || ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getStageIcon(name) {
  const value = String(name || '').toLowerCase();
  if (value.includes('checkout') || value.includes('git')) return <GitBranch size={20} className="w-5 h-5" />;
  if (value.includes('build') && !value.includes('docker')) return <Hammer size={20} className="w-5 h-5" />;
  if (value.includes('unit') || value.includes('test')) return <FlaskConical size={20} className="w-5 h-5" />;
  if (value.includes('docker')) return <Container size={20} className="w-5 h-5" />;
  if (value.includes('deploy')) return <Rocket size={20} className="w-5 h-5" />;
  return <Circle size={20} className="w-5 h-5" />;
}

function computeProgressRatio(stages) {
  if (!stages?.length || stages.length === 1) return 1;
  const totalSegments = stages.length - 1;
  const firstNonSuccess = stages.findIndex((s) => s.status !== 'success');
  if (firstNonSuccess === -1) return 1;
  const current = stages[firstNonSuccess]?.status;
  const baseSegments = Math.max(0, firstNonSuccess);
  const fractional = current === 'running' ? 0.5 : current === 'failed' ? 0.25 : 0;
  const ratio = (baseSegments + fractional) / totalSegments;
  return Math.min(1, Math.max(0, ratio));
}

const stageVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};

export default function PipelineFlow({ flowData }) {
  const stages = Array.isArray(flowData?.stages) ? flowData.stages : [];
  const buildNumber = flowData?.buildNumber ?? null;
  const status = flowData?.status || 'pending';
  const durationMs = typeof flowData?.durationMs === 'number' ? flowData.durationMs : null;
  const jobName = flowData?.jobName || '';
  const loading = !flowData;

  const normalizedStages = useMemo(
    () => (stages || []).map((stage) => ({
      name: stage?.name || 'Stage',
      status: normalizeStatus(stage?.status),
    })),
    [stages],
  );

  const overallStyle = STATUS_META[normalizeStatus(status)] || STATUS_META.pending;
  const jenkinsUrl = buildNumber && jobName ? `${JENKINS_BASE}/job/${encodeURIComponent(jobName)}/${buildNumber}/` : null;
  const progressRatio = computeProgressRatio(normalizedStages);

  const activeIndex = useMemo(() => {
    const runningIndex = normalizedStages.findIndex((s) => s.status === 'running');
    if (runningIndex !== -1) return runningIndex;
    const failedIndex = normalizedStages.findIndex((s) => s.status === 'failed');
    if (failedIndex !== -1) return failedIndex;
    const lastSuccess = [...normalizedStages].reverse().findIndex((s) => s.status === 'success');
    if (lastSuccess !== -1) return normalizedStages.length - 1 - lastSuccess;
    return 0;
  }, [normalizedStages]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-900/70 backdrop-blur-xl shadow-2xl">
      <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-indigo-500/10 dark:via-slate-800/30 dark:to-emerald-500/10" aria-hidden />
      <div className="relative p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">Pipeline Flow</span>
              <motion.span
                layout
                className={`text-[10px] px-2 py-1 rounded-full uppercase tracking-[0.12em] ${overallStyle.chip}`}
              >
                {overallStyle.label}
              </motion.span>
            </div>
            <div className="text-xs text-gray-600 dark:text-slate-400 flex items-center gap-2">
              <span>{buildNumber ? `Build #${buildNumber}` : 'Latest build'}</span>
              <span className="text-gray-400 dark:text-slate-600">•</span>
              <span className="text-gray-700 dark:text-slate-300">Duration {formatDuration(durationMs)}</span>
            </div>
          </div>
          {jenkinsUrl && (
            <a
              href={jenkinsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:hover:border-white/20 dark:hover:bg-white/10 transition-colors backdrop-blur"
            >
              View in Jenkins ↗
            </a>
          )}
        </div>

        {loading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !normalizedStages.length && (
          <div className="text-sm text-gray-600 dark:text-slate-400">No stage data available for the latest build.</div>
        )}

        {!loading && !!normalizedStages.length && (
          <div className="relative overflow-x-auto pb-4">
            <div className="min-w-[720px] px-1">
              <div className="relative flex items-center justify-between gap-6">
                <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gray-200 dark:bg-slate-700/60" aria-hidden />
                <motion.div
                  className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gradient-to-r from-green-500 via-yellow-400 to-gray-600"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progressRatio * 100}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  aria-hidden
                />

                {normalizedStages.map((stage, index) => {
                  const normalizedStatus = stage.status;
                  const style = STATUS_META[normalizedStatus] || STATUS_META.pending;
                  const isActive = index === activeIndex;
                  const isRunning = normalizedStatus === 'running';
                  const isFailed = normalizedStatus === 'failed';
                  const isSuccess = normalizedStatus === 'success';
                  const isPending = normalizedStatus === 'pending';
                  const stageIcon = getStageIcon(stage.name);
                  const statusBadge = (() => {
                    if (isRunning) {
                      return (
                        <span className="inline-flex h-3.5 w-3.5 rounded-full bg-yellow-200 animate-pulse" />
                      );
                    }
                    if (isSuccess) {
                      return (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                          className="text-green-100"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </motion.div>
                      );
                    }
                    if (isFailed) {
                      return (
                        <motion.div
                          initial={{ scale: 0.9, rotate: -5 }}
                          animate={{ scale: 1, rotate: [0, -8, 6, -4, 0] }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="text-red-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </motion.div>
                      );
                    }
                    return (
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0.7 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.25 }}
                        className="text-slate-200"
                      >
                        <Circle className="w-3.5 h-3.5" />
                      </motion.div>
                    );
                  })();

                  return (
                    <motion.div
                      key={`${stage.name}-${index}`}
                      variants={stageVariants}
                      initial="hidden"
                      animate="visible"
                      className="group relative flex flex-col items-center gap-2 min-w-[110px]"
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        animate={{ scale: isActive ? 1.1 : 1, boxShadow: isActive ? style.shadow : 'none' }}
                        className={`relative w-14 h-14 rounded-full flex items-center justify-center border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 shadow-md transition-all duration-300 ring-2 ${style.ring} ${isRunning ? 'animate-pulse' : ''} text-gray-900 dark:text-slate-100 ${
                          isRunning ? 'scale-[1.05]' : ''
                        }`}
                      >
                        <div className={`absolute inset-[3px] rounded-full ${style.dot} opacity-80`} aria-hidden />
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0.9 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.25 }}
                          className="relative flex items-center justify-center"
                        >
                          {stageIcon}
                        </motion.div>
                        <div
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-white/20 flex items-center justify-center shadow-sm ${
                            isSuccess
                              ? 'bg-green-500 text-white dark:text-slate-950'
                              : isFailed
                                ? 'bg-red-500 text-white'
                                : isRunning
                                  ? 'bg-yellow-300 text-slate-900'
                                  : 'bg-gray-200 text-gray-700 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {statusBadge}
                        </div>
                      </motion.div>

                      <div className="flex flex-col items-center text-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-slate-100 leading-tight">{stage.name}</span>
                        <span className={`text-[11px] mt-1 tracking-wide ${style.text}`}>{style.label}</span>
                      </div>

                      <AnimatePresence>
                        {(isRunning || isFailed) && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap"
                          >
                            <div className="rounded-xl border border-white/10 bg-slate-900/90 px-3 py-2 text-[11px] text-slate-100 shadow-xl shadow-black/40 backdrop-blur-lg">
                              <div className="font-semibold">Status: {style.label}</div>
                              <div className="text-slate-300">Click to view logs</div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}