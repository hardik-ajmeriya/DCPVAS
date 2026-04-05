import { useMemo } from 'react';
import { Cog6ToothIcon, ChartBarIcon, ListBulletIcon, LightBulbIcon, PlayCircleIcon } from '@heroicons/react/24/outline';
import { useJenkinsStatus } from '../context/JenkinsStatusContext';

export default function Navbar({ currentTab, onSelect }) {
  const tabs = useMemo(() => ([
    { key: 'Dashboard', icon: PlayCircleIcon },
    { key: 'Pipelines', icon: ChartBarIcon },
    { key: 'Execution History', icon: ListBulletIcon },
    { key: 'AI Insights', icon: LightBulbIcon },
    { key: 'Settings', icon: Cog6ToothIcon },
  ]), []);

  const { isConnected, jobName, warning } = useJenkinsStatus();

  const statusText = isConnected
    ? (jobName ? `Jenkins Connected · ${jobName}` : 'Jenkins Connected')
    : '⚠ Jenkins Disconnected';

  const statusTitle = isConnected
    ? (jobName ? `Connected to ${jobName}` : 'Jenkins Connected')
    : 'Unable to reach Jenkins server. Check configuration.';

  const statusClasses = isConnected
    ? 'bg-green-100 dark:bg-success text-green-800 dark:text-white'
    : 'bg-amber-100 dark:bg-amber-500 text-amber-800 dark:text-white';

  const statusIcon = isConnected ? '✓' : '⚠';

  return (
    <div className="nav-blur flex items-center justify-between px-4 py-3">
      <div className="text-xl font-semibold">DCPVAS</div>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusClasses}`}
          title={statusTitle}
          aria-label={statusTitle}
        >
          <span aria-hidden>{statusIcon}</span>
          <span>{statusText}</span>
        </span>
        <div className="flex gap-2">
        {tabs.map(({ key, icon: Icon }) => (
          <button
            key={key}
            className={`group px-3 py-2 rounded flex items-center gap-2 transition-all duration-200 ease-in-out ${currentTab === key ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 font-medium border-l-4 border-blue-500' : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-white/10 hover:text-blue-600 dark:hover:text-white'}`}
            onClick={() => onSelect(key)}
            aria-label={key}
          >
            <Icon className="w-5 h-5 text-gray-500 group-hover:text-blue-500" />
            <span className="hidden sm:inline">{key}</span>
          </button>
        ))}
        </div>
      </div>
    </div>
  );
}
