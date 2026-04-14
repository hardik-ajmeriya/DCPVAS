import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, List, ListRestart, MoreHorizontal, Search, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STATUS_ALL = 'ALL';
const BRANCH_ALL = 'ALL';

function normalizeStatus(rawStatus) {
  const status = String(rawStatus || '').toUpperCase();
  if (status === 'SUCCESS') return 'SUCCESS';
  if (status === 'FAILURE' || status === 'FAILED') return 'FAILED';
  if (status === 'RUNNING' || status === 'BUILDING' || status === 'IN_PROGRESS') return 'RUNNING';
  return 'UNKNOWN';
}

function deriveRowKey(row, index) {
  return row?._id || `${row?.jobName || 'pipeline'}#${row?.buildNumber || 'unknown'}#${index}`;
}

function PipelineTableInner({ rows = [], onSelect, title = 'Live Pipelines', subtitle = 'Auto-updates • No refresh', emptyMessage = 'No pipelines yet.' }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUS_ALL);
  const [branchFilter, setBranchFilter] = useState(BRANCH_ALL);
  const [favorites, setFavorites] = useState([]);
  const [openMenuKey, setOpenMenuKey] = useState(null);
  const menuContainerRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!menuContainerRef.current) return;
      if (!menuContainerRef.current.contains(event.target)) {
        setOpenMenuKey(null);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const branchOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((row) => {
      const value = String(row?.branch || '').trim();
      if (value) set.add(value);
    });
    return [BRANCH_ALL, ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const pipelineName = String(row?.jobName || 'Pipeline');
      const commit = String(row?.commit || '');
      const branch = String(row?.branch || '').trim();
      const status = normalizeStatus(row?.status || row?.buildStatus);

      const matchesSearch =
        query.length === 0 ||
        pipelineName.toLowerCase().includes(query) ||
        commit.toLowerCase().includes(query) ||
        String(row?.buildNumber || '').includes(query);

      const matchesStatus = statusFilter === STATUS_ALL || status === statusFilter;
      const matchesBranch = branchFilter === BRANCH_ALL || branch === branchFilter;

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [rows, search, statusFilter, branchFilter]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const toggleFavorite = (key) => {
    setFavorites((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      return [...prev, key];
    });
  };

  const renderStatus = (status) => {
    if (status === 'RUNNING') {
      return (
        <span className="inline-flex items-center gap-2 text-amber-300 font-medium">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-300" />
          </span>
          <span className="status-blink">Running...</span>
        </span>
      );
    }

    if (status === 'SUCCESS') {
      return <span className="inline-flex items-center gap-2 text-emerald-300 font-medium">SUCCESS</span>;
    }

    if (status === 'FAILED') {
      return <span className="inline-flex items-center gap-2 text-red-300 font-medium">FAILED</span>;
    }

    return <span className="inline-flex items-center gap-2 text-slate-400 font-medium">UNKNOWN</span>;
  };

  return (
    <div className="card-surface">
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <div className="font-semibold">{title}</div>
        {subtitle ? <div className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</div> : <div />}
      </div>

      <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-2">
        <label className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search pipeline / commit"
            className="w-full rounded-lg border border-white/10 bg-slate-900/50 pl-8 pr-3 py-2 text-sm text-slate-100 transition-all duration-200 ease-out"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 transition-all duration-200 ease-out"
        >
          <option value={STATUS_ALL}>All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="RUNNING">Running</option>
        </select>

        <select
          value={branchFilter}
          onChange={(event) => setBranchFilter(event.target.value)}
          className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-slate-100 transition-all duration-200 ease-out"
        >
          {branchOptions.map((branch) => (
            <option key={branch} value={branch}>
              {branch === BRANCH_ALL ? 'All Branches' : branch}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/70 sticky top-0 z-10 backdrop-blur">
            <tr className="text-gray-600 dark:text-gray-400">
              <th className="text-left py-2.5 px-2 w-12">Favorite</th>
              <th className="text-left py-2.5 pr-3">Pipeline</th>
              <th className="text-left py-2.5 pr-3">Branch</th>
              <th className="text-left py-2.5 pr-3">Commit</th>
              <th className="text-left py-2.5 pr-3">Duration</th>
              <th className="text-left py-2.5 pr-3">Status</th>
              <th className="text-left py-2.5 pr-3">Time</th>
              <th className="text-left py-2.5 px-2 w-14">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border-color)]" ref={menuContainerRef}>
            {filteredRows.map((row, index) => {
              const key = deriveRowKey(row, index);
              const status = normalizeStatus(row?.status || row?.buildStatus);
              const isFavorite = favoriteSet.has(key);
              const hasClickAction = typeof onSelect === 'function';

              return (
                <tr
                  key={key}
                  className={[
                    'group transition-colors duration-200 ease-out hover:bg-white/5',
                    hasClickAction ? 'cursor-pointer' : '',
                  ].join(' ')}
                  onClick={hasClickAction ? () => onSelect(row) : undefined}
                >
                  <td className="py-2.5 px-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(key);
                      }}
                      className="btn-ripple inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-amber-300 transition-colors duration-200 ease-out"
                      aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                    >
                      <Star className={`h-4 w-4 ${isFavorite ? 'fill-amber-300 text-amber-300' : ''}`} />
                    </button>
                  </td>

                  <td className="py-2.5 pr-3 font-medium text-gray-900 dark:text-gray-100">
                    {row?.jobName || 'Pipeline'} #{row?.buildNumber || '--'}
                  </td>
                  <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">{row?.branch || '—'}</td>
                  <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">{String(row?.commit || '').slice(0, 7) || '—'}</td>
                  <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">{row?.duration || '—'}</td>
                  <td className="py-2.5 pr-3">{renderStatus(status)}</td>
                  <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-400">
                    {row?.executedAt ? new Date(row.executedAt).toLocaleString() : '—'}
                  </td>

                  <td className="py-2.5 px-2 relative">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuKey((current) => (current === key ? null : key));
                      }}
                      className="btn-ripple inline-flex items-center justify-center rounded-md p-1.5 text-slate-300 hover:bg-white/10 transition-colors duration-200 ease-out"
                      aria-label="Open actions menu"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {openMenuKey === key && (
                      <div className="menu-fade-in absolute right-2 top-10 z-20 min-w-[150px] rounded-lg border border-white/10 bg-slate-900 shadow-xl p-1">
                        <button
                          type="button"
                          className="btn-ripple w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-slate-200 hover:bg-white/10 transition-colors duration-200 ease-out"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuKey(null);
                            onSelect?.(row);
                          }}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>View Details</span>
                        </button>

                        <button
                          type="button"
                          className="btn-ripple w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-slate-200 hover:bg-white/10 transition-colors duration-200 ease-out"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuKey(null);
                            navigate('/logs');
                          }}
                        >
                          <List className="h-3.5 w-3.5" />
                          <span>View Logs</span>
                        </button>

                        <button
                          type="button"
                          className="btn-ripple w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-slate-200 hover:bg-white/10 transition-colors duration-200 ease-out"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuKey(null);
                          }}
                        >
                          <ListRestart className="h-3.5 w-3.5" />
                          <span>Re-run Pipeline</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredRows.length === 0 && (
              <tr>
                <td colSpan="8" className="py-8 text-center text-gray-500">{emptyMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PipelineTable = memo(PipelineTableInner);

export default PipelineTable;
