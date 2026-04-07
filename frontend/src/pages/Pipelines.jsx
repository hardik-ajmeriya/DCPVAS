import { useEffect, useMemo, useState } from 'react';
import PipelineTable from '../components/PipelineTable';
import { getPipelineHistory } from '../services/api.js';
import PipelineListSkeleton from '../components/skeletons/PipelineListSkeleton';

const PAGE_SIZE = 10;

export default function Pipelines() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    let inFlight = false;

    const load = async ({ showLoading = false } = {}) => {
      if (inFlight) return;
      inFlight = true;
      try {
        if (showLoading) setLoading(true);
        const data = await getPipelineHistory('all');
        if (!mounted) return;
        setRuns(Array.isArray(data) ? data : []);
        setError('');
      } catch (err) {
        if (!mounted) return;
        setError('Failed to load pipelines');
      } finally {
        inFlight = false;
        if (mounted && showLoading) setLoading(false);
      }
    };

    load({ showLoading: true });
    const t = setInterval(() => load({ showLoading: false }), 30000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(runs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return runs.slice(start, start + PAGE_SIZE);
  }, [runs, currentPage]);

  const subtitle = loading
    ? 'Loading pipelines...'
    : error
      ? error
      : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}-${Math.min(currentPage * PAGE_SIZE, runs.length)} of ${runs.length}`;

  return (
    <div className="p-4 space-y-4">
      <div className="text-xl font-semibold">All Pipeline Builds</div>
      {loading ? (
        <PipelineListSkeleton variant="table" rows={PAGE_SIZE} />
      ) : (
        <PipelineTable rows={pageRows} title="All Pipeline Builds" subtitle={subtitle} />
      )}

      {!loading && (
        <div className="flex items-center justify-between text-sm text-gray-300">
          <div>Page {currentPage} of {totalPages}</div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded border border-[var(--border-color)] hover:bg-[var(--hover-surface)] disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <button
              className="px-3 py-1 rounded border border-[var(--border-color)] hover:bg-[var(--hover-surface)] disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
