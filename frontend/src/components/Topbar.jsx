import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useJenkinsStatus } from '../context/JenkinsStatusContext';
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';

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
    <div className="navbar nav-blur justify-between">
      {/* Logo */}
      <div className="flex items-center">
        <Link to="/" aria-label="Go to Dashboard" className="logo-container">
          <img src="/logo.png" alt="DCPVAS Logo" />
        </Link>
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
        <div className="flex items-center">
          <SignedIn>
            <UserButton afterSignOutUrl="/sign-in" />
          </SignedIn>
          <SignedOut>
            {/* Optional: replace with RedirectToSignIn or custom button */}
          </SignedOut>
        </div>
      </div>
    </div>
  );
}
