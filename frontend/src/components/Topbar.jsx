import { useMemo } from 'react';
import { useJenkinsStatus } from '../context/JenkinsStatusContext.jsx';
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { UserButton } from '@clerk/react';

export default function Topbar({ currentTab, onSelect }) {
  const { isConnected, jobName, warning } = useJenkinsStatus();

  const statusText = useMemo(() => {
    if (isConnected) return jobName ? `Jenkins Connected · ${jobName}` : 'Jenkins Connected';
    return '⚠ Jenkins Disconnected';
  }, [isConnected, jobName, warning]);

  const statusTitle = isConnected ? (jobName ? `Connected to ${jobName}` : 'Jenkins Connected') : 'Unable to reach Jenkins server. Check configuration.';
  const statusColor = isConnected ? 'bg-green-600' : 'bg-amber-600';

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
        <span className={`px-3 py-1 rounded-full text-xs text-white ${statusColor}`} title={statusTitle}>{statusText}</span>
        <button className="p-2 rounded-lg hover-surface" title="Notifications">
          <BellIcon className="w-5 h-5" />
        </button>
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  );
}
