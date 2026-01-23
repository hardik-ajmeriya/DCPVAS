import { useEffect, useMemo, useState } from 'react';
import FailureAnalysis from '../components/FailureAnalysis.jsx';
import { getLatestPipeline } from '../services/api.js';
import { subscribeAnalysis, subscribeBuilds } from '../services/socket.js';
import { getRawLogs, getPipelineBuild } from '../services/api.js';

export default function Dashboard({ mode }) {
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getLatestPipeline();
        setLatest(data);
        setError('');
      } catch (e) {
        setError('Failed to load latest');
        setLatest(null);
      } finally {
        setLoading(false);
      }
    }

    load();
    // Initial load only; real-time updates via Socket.IO below
  }, []);
  // Real-time updates via Socket.IO (no polling)
  useEffect(() => {
    // Handlers for progress and completion events
    const unsubscribe = subscribeAnalysis({
      onProgress: (payload) => {
        // payload: { buildNumber, status, stage, message }
        setLatest((prev) => {
          // Update only if build number matches or if no previous data
          if (!prev || prev.buildNumber === payload.buildNumber || prev.analysisStatus === 'ANALYSIS_IN_PROGRESS') {
            return {
              ...(prev || {}),
              buildNumber: payload.buildNumber ?? prev?.buildNumber ?? null,
              status: prev?.status || 'UNKNOWN',
              analysisStatus: payload.status,
              analysisStep: payload.stage,
            };
          }
          return prev;
        });
      },
      onComplete: async (payload) => {
        // payload: { buildNumber, status: 'READY', humanSummary, suggestedFix, technicalRecommendation, confidenceScore }
        let logsText = null;
        try {
          const res = await getRawLogs(payload.buildNumber);
          logsText = res?.rawLogs || null;
        } catch {}
        setLatest((prev) => {
          if (!prev || prev.buildNumber === payload.buildNumber) {
            return {
              ...(prev || {}),
              buildNumber: payload.buildNumber ?? prev?.buildNumber ?? null,
              analysisStatus: payload.status || 'READY',
              analysisStep: 'READY',
              humanSummary: payload.humanSummary ?? prev?.humanSummary ?? null,
              suggestedFix: payload.suggestedFix ?? prev?.suggestedFix ?? null,
              technicalRecommendation: payload.technicalRecommendation ?? prev?.technicalRecommendation ?? null,
              confidenceScore: typeof payload.confidenceScore === 'number' ? payload.confidenceScore : (prev?.confidenceScore ?? null),
              logs: logsText ?? prev?.logs ?? null,
            };
          }
          return prev;
        });
      },
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Build lifecycle events: build:new and build:success
  useEffect(() => {
    const unsubscribe = subscribeBuilds({
      onNew: (payload) => {
        // payload: { jobName, buildNumber }
        setLatest((prev) => {
          // Only update if no data or newer build number
          if (!prev || (payload?.buildNumber && payload.buildNumber !== prev.buildNumber)) {
            return {
              jobName: payload?.jobName || prev?.jobName || 'Pipeline',
              buildNumber: payload?.buildNumber || prev?.buildNumber || null,
              status: 'UNKNOWN',
              analysisStatus: 'ANALYSIS_IN_PROGRESS',
              analysisStep: 'FETCHING_LOGS',
            };
          }
          return prev;
        });
      },
      onSuccess: async (payload) => {
        // payload: { buildNumber }
        let logsText = null;
        try {
          const res = await getRawLogs(payload.buildNumber);
          logsText = res?.rawLogs || null;
        } catch {}
        setLatest((prev) => {
          if (!prev || prev.buildNumber === payload?.buildNumber) {
            return {
              ...(prev || {}),
              buildNumber: payload?.buildNumber ?? prev?.buildNumber ?? null,
              status: 'SUCCESS',
              aiAnalysis: { skipped: true, reason: 'NO_FAILURE_DETECTED' },
              analysisStatus: undefined,
              analysisStep: undefined,
              logs: logsText ?? prev?.logs ?? null,
            };
          }
          return prev;
        });
      },
    });
    return () => unsubscribe();
  }, []);

  const lastUpdatedLabel = useMemo(() => {
    if (!latest?.executedAt) return null;
    const basis = latest.executedAt;
    const diff = Math.floor((Date.now() - new Date(basis).getTime()) / 1000);
    return `Last updated: ${diff}s ago`;
  }, [latest]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">Dashboard</div>
          <div className="text-sm text-green-700">Latest execution summary {lastUpdatedLabel ? `• ${lastUpdatedLabel}` : ''}</div>
          <p className="text-xs text-gray-500 mt-1">Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {latest && (
        <div className="p-4 bg-white rounded shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">{latest.jobName || 'Pipeline'}</div>
              <div className="text-sm text-gray-600">Build #{latest.buildNumber}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-xs ${latest.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : latest.status === 'FAILURE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                {latest.status}
              </span>
              {latest?.failedStage && (
                <span className="text-xs text-gray-600">Failed Stage: {latest.failedStage}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {latest && <FailureAnalysis run={latest} />}
      {latest && latest.analysisStatus === 'ANALYSIS_IN_PROGRESS' && (
        <div className="text-sm text-gray-600 mt-2">
          Analyzing logs… please wait
          {latest.analysisStep && (
            <span className="ml-2">(Step: {latest.analysisStep})</span>
          )}
        </div>
      )}
    </div>
  );
}
