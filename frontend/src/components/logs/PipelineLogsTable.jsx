import React, { memo, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

const LEVEL_ALL = 'ALL';
const BRANCH_ALL = 'ALL';

const LEVEL_STYLES = {
  INFO: {
    dot: 'bg-blue-400',
    text: 'text-blue-300',
  },
  ERROR: {
    dot: 'bg-red-400',
    text: 'text-red-300',
  },
  WARN: {
    dot: 'bg-amber-400',
    text: 'text-amber-300',
  },
  DEBUG: {
    dot: 'bg-violet-400',
    text: 'text-violet-300',
  },
};

function inferLevel(message = '') {
  const upper = String(message).toUpperCase();
  if (upper.includes('ERROR') || upper.includes('FAIL')) return 'ERROR';
  if (upper.includes('WARN')) return 'WARN';
  if (upper.includes('DEBUG')) return 'DEBUG';
  return 'INFO';
}

function normalizeLevel(level, message) {
  const upper = String(level || '').toUpperCase();
  if (LEVEL_STYLES[upper]) return upper;
  return inferLevel(message);
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '--';
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return String(timestamp);
  return parsed.toLocaleTimeString();
}

function parseLegacyLine(line, index) {
  const content = String(line || '');
  const timestampMatch = content.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/);
  const levelMatch = content.match(/\b(INFO|ERROR|WARN|DEBUG)\b/i);
  const serviceMatch = content.match(/\[(?<service>[^\]]+)\]|\b(?:service|hostname)=([^\s]+)/i);
  const branchMatch = content.match(/\bbranch=([^\s]+)/i);

  const timestamp = timestampMatch ? timestampMatch[1] : null;
  const level = normalizeLevel(levelMatch ? levelMatch[1] : '', content);
  const service = serviceMatch?.groups?.service || serviceMatch?.[2] || '--';
  const branch = branchMatch?.[1] || null;

  return {
    id: null,
    _idx: index,
    timestamp,
    level,
    service,
    branch,
    message: content,
  };
}

function normalizeLogs(logs) {
  if (Array.isArray(logs)) {
    return logs.map((log, index) => {
      if (typeof log === 'string') {
        return parseLegacyLine(log, index);
      }

      const message = typeof log?.message === 'string'
        ? log.message
        : typeof log?.msg === 'string'
          ? log.msg
          : JSON.stringify(log?.message ?? log?.msg ?? '');

      return {
        id: log?.id || log?._id || null,
        _idx: index,
        timestamp: log?.timestamp || log?.time || log?.createdAt || null,
        level: normalizeLevel(log?.level, message),
        service: log?.service || log?.hostname || '--',
        branch: log?.branch || null,
        message: message || '',
      };
    });
  }

  if (typeof logs === 'string') {
    return logs
      .split('\n')
      .map((line, index) => parseLegacyLine(line, index))
      .filter((entry) => entry.message.trim().length > 0);
  }

  return [];
}

function LevelBadge({ level }) {
  const tone = LEVEL_STYLES[level] || LEVEL_STYLES.INFO;

  return (
    <span className={`inline-flex items-center gap-2 ${tone.text}`}>
      <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
      <span className="font-semibold tracking-wide">{level}</span>
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/5">
      <td className="px-3 py-2">
        <div className="h-3 w-16 rounded skeleton-line" />
      </td>
      <td className="px-3 py-2">
        <div className="h-3 w-24 rounded skeleton-line" />
      </td>
      <td className="px-3 py-2">
        <div className="h-3 w-20 rounded skeleton-line" />
      </td>
      <td className="px-3 py-2">
        <div className="h-3 w-full rounded skeleton-line" />
      </td>
    </tr>
  );
}

function PipelineLogsTableInner({ logs, loading = false }) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState(LEVEL_ALL);
  const [branchFilter, setBranchFilter] = useState(BRANCH_ALL);
  const entries = useMemo(() => normalizeLogs(logs), [logs]);

  const branchOptions = useMemo(() => {
    const set = new Set();
    entries.forEach((entry) => {
      const value = String(entry?.branch || '').trim();
      if (value) set.add(value);
    });
    return [BRANCH_ALL, ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const service = String(entry?.service || '').toLowerCase();
      const message = String(entry?.message || '').toLowerCase();
      const level = String(entry?.level || '').toUpperCase();
      const branch = String(entry?.branch || '').trim();

      const matchesSearch = query.length === 0 || service.includes(query) || message.includes(query);
      const matchesLevel = levelFilter === LEVEL_ALL || level === levelFilter;
      const matchesBranch = branchFilter === BRANCH_ALL || branch === branchFilter;

      return matchesSearch && matchesLevel && matchesBranch;
    });
  }, [entries, search, levelFilter, branchFilter]);

  return (
    <div
      className="rounded-xl border border-white/10 bg-slate-950/70 overflow-hidden"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <div className="border-b border-white/10 p-2 grid grid-cols-1 md:grid-cols-3 gap-2">
        <label className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search logs"
            className="w-full rounded-lg border border-white/10 bg-slate-900/70 pl-8 pr-3 py-2 text-xs text-slate-100 transition-all duration-200 ease-out"
          />
        </label>

        <select
          value={levelFilter}
          onChange={(event) => setLevelFilter(event.target.value)}
          className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 transition-all duration-200 ease-out"
        >
          <option value={LEVEL_ALL}>All Levels</option>
          <option value="INFO">Info</option>
          <option value="ERROR">Error</option>
          <option value="WARN">Warn</option>
          <option value="DEBUG">Debug</option>
        </select>

        {branchOptions.length > 1 ? (
          <select
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
            className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 transition-all duration-200 ease-out"
          >
            {branchOptions.map((branch) => (
              <option key={branch} value={branch}>
                {branch === BRANCH_ALL ? 'All Branches' : branch}
              </option>
            ))}
          </select>
        ) : (
          <div className="rounded-lg border border-white/10 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
            Branch filter unavailable
          </div>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto scroll-smooth">
        <table className="w-full table-fixed text-xs text-slate-200">
          <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-white/10">
            <tr>
              <th className="w-28 px-3 py-2 text-left font-medium text-slate-300">Level</th>
              <th className="w-32 px-3 py-2 text-left font-medium text-slate-300">Timestamp</th>
              <th className="w-32 px-3 py-2 text-left font-medium text-slate-300">Service</th>
              <th className="px-3 py-2 text-left font-medium text-slate-300">Message</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <SkeletonRow key={`skeleton-${index}`} />
              ))
            ) : filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                  {entries.length > 0 ? 'No logs available' : 'No logs available'}
                </td>
              </tr>
            ) : (
              filteredEntries.map((entry, index) => (
                <tr
                  key={entry.id || index}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-3 py-2 align-top">
                    <LevelBadge level={entry.level} />
                  </td>
                  <td className="px-3 py-2 align-top text-slate-300">{formatTimestamp(entry.timestamp)}</td>
                  <td className="px-3 py-2 align-top text-slate-300">{entry.service || '--'}</td>
                  <td className="px-3 py-2 align-top text-[11px] leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
                    {entry.message || ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PipelineLogsTable = memo(PipelineLogsTableInner);

export default PipelineLogsTable;