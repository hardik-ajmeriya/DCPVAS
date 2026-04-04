import { useEffect, useMemo, useState } from 'react';
import FailureAnalysis from '../components/FailureAnalysis.jsx';
import Modal from '../components/Modal.jsx';
// Modal view now uses FailureAnalysis; keep ExecutionDetails unused for now
import PipelineGraph from '../components/PipelineGraph.jsx';
import { getPipelineHistory, getPipelineBuild } from '../services/api.js';
import { subscribeBuilds, subscribeAnalysis } from '../services/socket.js';

export default function History() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | SUCCESS | FAILURE | UNKNOWN

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getPipelineHistory('all');
        setRows(Array.isArray(data) ? data : []);
        setError('');
      } catch (e) {
        setError('Failed to load history');
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Live updates: push new builds and mark successes without REST
  useEffect(() => {
    const unsubBuilds = subscribeBuilds({
      onNew: (payload) => {
        setRows((prev) => {
          const exists = prev.some((r) => r.buildNumber === payload?.buildNumber);
          if (exists) return prev;
          const item = {
            jobName: payload?.jobName || 'Pipeline',
            buildNumber: payload?.buildNumber,
            status: 'UNKNOWN',
            executedAt: new Date().toISOString(),
            failedStage: null,
            confidenceScore: 0,
          };
          return [item, ...prev].slice(0, 1000);
        });
      },
      onSuccess: (payload) => {
        setRows((prev) => prev.map((r) => (
          r.buildNumber === payload?.buildNumber ? { ...r, status: 'SUCCESS' } : r
        )));
      },
    });
    const unsubAnalysis = subscribeAnalysis({
      onProgress: (p) => {
        setRows((prev) => prev.map((r) => (
          r.buildNumber === p?.buildNumber ? { ...r, status: 'FAILURE' } : r
        )));
      },
      onComplete: (p) => {
        setRows((prev) => prev.map((r) => (
          r.buildNumber === p?.buildNumber ? { ...r, status: 'FAILURE' } : r
        )));
      },
    });
    return () => { unsubBuilds(); unsubAnalysis(); };
  }, []);

  const viewBuild = async (row) => {
    // Open modal immediately with existing list data
    setSelected(row);
    try {
      const detail = await getPipelineBuild(row.buildNumber);
      setSelected((prev) => ({ ...(prev || {}), ...(detail || {}) }));
    } catch (e) {
      // Keep existing data; do not close modal
    }
  };

  // Modal polling: fetch build every 2s until analysis progress reaches COMPLETED
  useEffect(() => {
    if (!selected?.buildNumber) return;
    let cancelled = false;
    let timer = null;
    const fetchOnce = async () => {
      try {
        const detail = await getPipelineBuild(selected.buildNumber);
        if (cancelled) return;
        if (detail) {
          setSelected((prev) => ({ ...(prev || {}), ...(detail || {}) }));
          const progress = String(detail?.analysisStatus || detail?.progress || '').toUpperCase();
          // Stop polling only when progress === COMPLETED
          if (progress === 'COMPLETED') return;
        }
      } catch (_) {
        // Ignore transient errors during polling
      }
      timer = setTimeout(fetchOnce, 2000);
    };
    fetchOnce();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [selected?.buildNumber]);

  const filteredRows = useMemo(() => {
    const normalizeStatus = (s) => {
      const v = String(s || '').toUpperCase();
      return v === 'FAILED' ? 'FAILURE' : v;
    };
    let list = rows.map((r) => ({ ...r, status: normalizeStatus(r.status) }));
    if (statusFilter !== 'ALL') {
      list = list.filter((r) => normalizeStatus(r.status) === statusFilter);
    }
    list.sort((a, b) => {
      const na = Number(a.buildNumber) || 0;
      const nb = Number(b.buildNumber) || 0;
      return sortOrder === 'asc' ? na - nb : nb - na;
    });
    return list;
  }, [rows, sortOrder, statusFilter]);

  return (
    <div className="p-4 space-y-4">
      <div className="text-xl font-semibold">Execution History</div>

      <div className="p-4 bg-white rounded shadow">
        {/* Filters */}
        <div className="mb-3 grid sm:grid-cols-3 gap-3 text-sm">
          <label className="flex flex-col">
            <span className="text-gray-600 mb-1">Sort by</span>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} aria-label="Sort order">
              <option value="desc">Build # Descending</option>
              <option value="asc">Build # Ascending</option>
            </select>
          </label>
          <label className="flex flex-col">
            <span className="text-gray-600 mb-1">Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status filter">
              <option value="ALL">All</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILURE">Failure</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </label>
        </div>
        {loading && <div className="text-sm text-gray-500">Loading…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && filteredRows.length === 0 && <div className="text-sm text-gray-500">No history yet.</div>}

        {filteredRows.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRows.map((r) => {
              const statusChip = r.status === 'SUCCESS'
                ? 'bg-green-100 text-green-800'
                : r.status === 'FAILURE'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800';
              const statusBorder = r.status === 'SUCCESS'
                ? 'border-green-500'
                : r.status === 'FAILURE'
                  ? 'border-red-500'
                  : 'border-gray-400';
              return (
                <div
                  key={r._id || `${r.jobName || 'pipeline'}#${r.buildNumber}`}
                  className={`rounded-lg border ${statusBorder} border-l-4 bg-white hover-surface p-4 flex flex-col gap-3`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600">{r.jobName || 'Pipeline'}</div>
                      <div className="text-lg font-semibold">#{r.buildNumber}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${statusChip}`}>{r.status === 'FAILURE' ? 'FAILED' : r.status}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Failed Stage:</span>
                      <span className="font-medium text-gray-700">{r.failedStage || '—'}</span>
                    </div>
                    <div className="text-gray-700">{r.executedAt ? new Date(r.executedAt).toLocaleString() : '—'}</div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      className="px-3 py-1 rounded bg-gray-900 text-gray-50 text-xs hover:bg-gray-800 dark:bg-black dark:text-white dark:hover:bg-neutral"
                      onClick={() => viewBuild(r)}
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Execution Details — #${selected.buildNumber}` : 'Execution Details'}
      >
        {selected ? (
          <div className="space-y-4">
            {/* Header summary */}
            <div className="p-4 bg-white rounded shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">{selected?.jobName || 'Pipeline'}</div>
                  <div className="text-lg font-semibold">#{selected?.buildNumber}</div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${selected?.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : selected?.status === 'FAILURE' || selected?.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{(selected?.status || 'UNKNOWN').toUpperCase()}</span>
              </div>
            </div>
            {selected?.stages && <PipelineGraph run={selected} />}
            {/* Use unified FailureAnalysis component for production-grade UX */}
            <FailureAnalysis run={selected} />
          </div>
        ) : (
          <div className="text-sm text-gray-600">Loading…</div>
        )}
      </Modal>
    </div>
  );
}
