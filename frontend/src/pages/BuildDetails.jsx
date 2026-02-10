import { useEffect, useRef, useState } from 'react';
import FailureAnalysis from '../components/FailureAnalysis.jsx';
import PipelineGraph from '../components/PipelineGraph.jsx';
import { ProgressBar } from '../components/FailureAnalysis.jsx';
import { subscribeBuilds, subscribeConnection } from '../services/socket.js';
import { useBuildDetailsQuery, useLatestBuildQuery, useAnalysisStatusQuery } from '../services/queries.js';
import { useQueryClient } from '@tanstack/react-query';
import { getPipelineAnalysis } from '../services/api.js';

export default function BuildDetails({ buildNumber }) {
  const [data, setData] = useState(null);
  const [currentBuildNumber, setCurrentBuildNumber] = useState(buildNumber);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { data: qData, isFetching } = useBuildDetailsQuery(currentBuildNumber);
  useEffect(() => {
    setData(qData || null);
    setLoading(isFetching);
  }, [qData, isFetching]);

  // Fallback: poll latest build and auto-switch when a newer build appears
  const { data: latest } = useLatestBuildQuery();
  useEffect(() => {
    const latestNumber = Number(latest?.buildNumber);
    if (Number.isFinite(latestNumber) && latestNumber > 0 && latestNumber !== currentBuildNumber) {
      // Switch to the latest build when it changes
      setCurrentBuildNumber(latestNumber);
      setData({
        jobName: latest?.jobName || (data?.jobName ?? 'Pipeline'),
        buildNumber: latestNumber,
        status: 'UNKNOWN',
        buildStatus: latest?.buildStatus || 'BUILDING',
        analysisStatus: 'WAITING_FOR_BUILD',
        logs: '',
        stages: [],
        consoleUrl: '',
      });
    }
  }, [latest?.buildNumber]);

  // Force final flush when analysis status reaches COMPLETED (polling or sockets)
  const { data: analysisStatusObj } = useAnalysisStatusQuery(currentBuildNumber);
  const queryClient = useQueryClient();
  useEffect(() => {
    const status = typeof analysisStatusObj === 'object' ? analysisStatusObj?.status : analysisStatusObj;
    const hasFinal = typeof analysisStatusObj === 'object' ? (analysisStatusObj?.finalResult != null) : (data?.finalResult != null);
    if (status === 'COMPLETED' && currentBuildNumber) {
      // Invalidate build details to refetch once and update UI, then polling stops
      queryClient.invalidateQueries({ queryKey: ['pipeline', 'build', Number(currentBuildNumber)] });
      // If final result still not present, continue invalidating to force a refresh on next tick
      if (!hasFinal) {
        queryClient.invalidateQueries({ queryKey: ['pipeline', 'build', Number(currentBuildNumber)] });
      }
    }
  }, [analysisStatusObj, currentBuildNumber]);

  // Visual step with failsafe to simulate STORING_RESULTS on sudden COMPLETED
  const prevStepRef = useRef(null);
  const [visualStep, setVisualStep] = useState(null);
  useEffect(() => {
    const status = typeof analysisStatusObj === 'object' ? analysisStatusObj?.status : analysisStatusObj;
    const incoming = status || data?.analysisStatus || null;
    const prev = prevStepRef.current;
    prevStepRef.current = incoming;
    if (!incoming) return;
    if (incoming === 'COMPLETED' && prev && prev !== 'STORING_RESULTS') {
      setVisualStep('STORING_RESULTS');
      const t = setTimeout(() => setVisualStep('COMPLETED'), 1000);
      return () => clearTimeout(t);
    }
    setVisualStep(incoming);
  }, [analysisStatusObj, data?.analysisStatus]);

  // Simple fetch: when analysis is completed, get final analysis and store in state
  useEffect(() => {
    const status = data?.analysisStatus;
    const buildNo = currentBuildNumber;
    if (!buildNo) return;
    if (status !== 'COMPLETED') return;
    // Avoid refetching if we already have a final result
    if (data?.finalResult != null && data?.analysis) return;
    (async () => {
      try {
        const analysis = await getPipelineAnalysis(buildNo);
        setData((prev) => ({
          ...(prev || {}),
          analysis: analysis || prev?.analysis || {},
          // Mark final result present so UI renders immediately
          finalResult: true,
        }));
      } catch (err) {
        // Keep UI responsive; optionally set error state
        console.error('Failed to fetch pipeline analysis', err);
      }
    })();
  }, [data?.analysisStatus, currentBuildNumber]);

  // Fallback: if no events for 20s during analysis, show retry message
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (!buildNumber) return;
    if (!data) return;
    const status = data?.analysisStatus;
    setStale(false);
    if (status === 'AI_ANALYZING') {
      const t = setTimeout(() => setStale(true), 20000);
      return () => clearTimeout(t);
    }
  }, [buildNumber, data?.analysisStatus]);

  // React Query handles refetch intervals; remove manual polling

  useEffect(() => {
    if (!currentBuildNumber) return;
    // Subscribe to analysis and build lifecycle events for this build
    const unsubB = subscribeBuilds({
      onNew: async (payload) => {
        if (!payload?.buildNumber) return;
        // Hard reset to new build
        setCurrentBuildNumber(payload.buildNumber);
        // Immediate UI reset to BUILDING state; then refetch
        setData({
          jobName: payload.jobName || (data?.jobName ?? 'Pipeline'),
          buildNumber: payload.buildNumber,
          status: 'UNKNOWN',
          buildStatus: 'BUILDING',
          analysisStatus: 'WAITING_FOR_BUILD',
          logs: '',
          stages: [],
          consoleUrl: '',
        });
      },
      onStarted: async (payload) => {
        if (payload?.buildNumber !== currentBuildNumber) return;
      },
      onLogUpdate: async (payload) => {
        if (payload?.buildNumber !== currentBuildNumber) return;
      },
      onCompleted: async (payload) => {
        if (payload?.buildNumber !== currentBuildNumber) return;
      },
    });
    const unsubC = subscribeConnection({
      onConnect: async () => {
      },
      onReconnect: async () => {
      },
    });
    return () => {
      unsubB();
      unsubC();
    };
  }, [currentBuildNumber]);

  if (!currentBuildNumber) return <div className="text-sm text-gray-500">No build selected.</div>;
  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded shadow">
        {loading && <div className="text-sm text-gray-500">Loading…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {data && (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{data.jobName || 'Pipeline'}</div>
              <div className="text-sm text-gray-600">Build #{data.buildNumber}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-xs ${data.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : data.status === 'FAILURE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                {data.status}
              </span>
              {stale && data?.analysisStatus === 'AI_ANALYZING' && (
                <span className="text-xs text-yellow-700">No updates detected — retrying soon…</span>
              )}
              {(data?.failedStage || data?.analysis?.failedStage) && (
                <span className="text-xs text-gray-600">Failed Stage: {data.failedStage || data?.analysis?.failedStage}</span>
              )}
            </div>
          </div>
        )}
            {/* Centered progress stepper after build information */}
            {visualStep && visualStep !== 'FAILED' && (
              <ProgressBar step={visualStep} />
            )}

      </div>

      {data?.status === 'SUCCESS' && (
        <div className="rounded border border-green-300 bg-green-50 text-green-800 px-3 py-2 text-sm">✅ Pipeline Completed Successfully</div>
      )}

      {data?.stages && <PipelineGraph run={data} />}

      {data && <FailureAnalysis run={data} />}
    </div>
  );
}
