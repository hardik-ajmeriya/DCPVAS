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
  const statusClasses = isConnected
    ? 'bg-green-100 dark:bg-green-600 text-green-800 dark:text-white'
    : 'bg-amber-100 dark:bg-amber-600 text-amber-800 dark:text-white';

  return (
    <div className="nav-blur flex items-center justify-between px-4 py-3">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-lg text-[#7C5CFF]">DCPVAS</span>
        <span className="text-sm text-slate-300">AI CI/CD Analyzer</span>
      </div>
      {/* Center search */}
      <div className="flex items-center gap-2 w-full max-w-xl">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Search pipelines…"
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-gray-100 dark:bg-[var(--bg-primary)] border border-gray-200 dark:border-[var(--border-color)] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/40 transition-all duration-200 ease-in-out"
          />
        </div>
      </div>
      {/* Right side: Jenkins badge, notifications, avatar */}
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-xs ${statusClasses}`} title={statusTitle}>{statusText}</span>
        <button className="p-2 rounded-lg hover-surface" title="Notifications">
          <BellIcon className="w-5 h-5" />
        </button>
        <UserButton afterSignOutUrl="/" />
      </div>
    </div>
  );
}
