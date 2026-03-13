import { useMemo } from 'react';
import { useJenkinsStatus } from '../context/JenkinsStatusContext.jsx';
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function Topbar({ currentTab, onSelect }) {
  const { isConnected, jobName, warning } = useJenkinsStatus();

  const statusText = useMemo(() => {
    if (isConnected) return jobName ? `Jenkins Connected · ${jobName}` : 'Jenkins Connected';
    return warning ? 'Jenkins Unreachable' : 'Jenkins Not Connected';
  }, [isConnected, jobName, warning]);

  const statusColor = isConnected ? 'bg-green-600' : warning ? 'bg-red-600' : 'bg-neutral';

  return (
    <div className="nav-blur flex items-center justify-between px-4 py-3">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg accent-gradient" />
        <div className="text-lg font-semibold">DCPVAS</div>
      </div>
      {/* Center search */}
      <div className="flex items-center gap-2 w-full max-w-xl">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search pipelines…"
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm"
          />
        </div>
      </div>
      {/* Right side: Jenkins badge, notifications, avatar */}
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-xs text-white ${statusColor}`}>{statusText}</span>
        <button className="p-2 rounded-lg hover-surface" title="Notifications">
          <BellIcon className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-[var(--hover-surface)] border border-[var(--border-color)]" title="User" />
      </div>
    </div>
  );
}
