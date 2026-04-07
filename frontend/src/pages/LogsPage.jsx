import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BuildList from '../components/logs/BuildList';
import LogsViewer from '../components/logs/LogsViewer';
import AIAnalysisPanel from '../components/logs/AIAnalysisPanel';
import { getPipelineHistory, getPipelineBuild } from '../services/api.js';
import LogsSkeleton from '../components/skeletons/LogsSkeleton';

export default function LogsPage() {
  const [builds, setBuilds] = useState([]);
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [buildData, setBuildData] = useState(null);
  const [logs, setLogs] = useState('');
  const [loadingBuilds, setLoadingBuilds] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadBuilds = async () => {
      setLoadingBuilds(true);
      setError(null);
      try {
        const runs = await getPipelineHistory();
        if (!isMounted) return;
        const sorted = [...runs].sort((a, b) => {
          const an = Number(a.buildNumber) || 0;
          const bn = Number(b.buildNumber) || 0;
          return bn - an;
        });
        setBuilds(sorted);
      } catch (err) {
        if (!isMounted) return;
        setError('Failed to load build history.');
      } finally {
        if (isMounted) setLoadingBuilds(false);
      }
    };

    loadBuilds();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchBuildData = useCallback(async (buildNumber) => {
    if (!buildNumber) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getPipelineBuild(buildNumber);
      setBuildData(data || null);
      const text = typeof data?.logs === 'string' ? data.logs : '';
      setLogs(text);
    } catch (err) {
      setError('Failed to load build data for the selected build.');
      setBuildData(null);
      setLogs('');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectBuild = useCallback((buildNumber) => {
    setSelectedBuild(buildNumber);
    setBuildData(null);
    setLogs('');
    fetchBuildData(buildNumber);
  }, [fetchBuildData]);

  const effectiveError = useMemo(() => error, [error]);

  const showInitialSkeleton = loadingBuilds && builds.length === 0;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-[#020617] text-gray-900 dark:text-slate-100 gap-3">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-slate-50">Pipeline Logs</h1>
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5">
            Inspect CI/CD console output, triage failures, and trace execution history.
          </p>
        </div>
      </div>

      {showInitialSkeleton ? (
        <LogsSkeleton variant="page" />
      ) : (
        <div className="flex flex-1 min-h-0 gap-3 overflow-hidden">
          <div className="w-full md:w-1/4 lg:w-1/5 min-h-0 h-full overflow-y-auto">
            <div className="min-h-full bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_0_20px_rgba(0,0,0,0.3)] rounded-2xl">
              <BuildList
                builds={builds}
                selectedBuild={selectedBuild}
                onSelectBuild={handleSelectBuild}
                loading={loadingBuilds}
                error={effectiveError}
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 h-full overflow-y-auto">
            <div className="min-h-full bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_0_20px_rgba(0,0,0,0.3)] rounded-2xl">
              <LogsViewer
                logs={logs}
                loading={loading}
                hasSelectedBuild={selectedBuild != null}
                error={effectiveError && !loadingBuilds ? effectiveError : null}
              />
            </div>
          </div>
          <div className="w-1/4 min-h-0 h-full overflow-y-auto hidden md:block">
            <div className="min-h-full bg-white dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-[0_0_20px_rgba(0,0,0,0.3)] rounded-2xl">
              <AIAnalysisPanel
                selectedBuild={selectedBuild}
                buildData={buildData}
                loading={loading}
                error={effectiveError && !loadingBuilds ? effectiveError : null}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
