import { useMemo } from 'react';
import { Cog6ToothIcon, ChartBarIcon, ListBulletIcon, LightBulbIcon, PlayCircleIcon } from '@heroicons/react/24/outline';
import { useJenkinsStatus } from '../context/JenkinsStatusContext.jsx';

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
    : 'Jenkins Not Connected';

  const statusTitle = isConnected
    ? (jobName ? `Connected to ${jobName}` : 'Jenkins Connected')
    : (warning ? 'Jenkins unreachable' : 'Jenkins Not Connected');

  const statusClasses = isConnected
    ? 'bg-success text-white'
    : (warning ? 'bg-failure text-white' : 'bg-neutral text-white');

  const statusIcon = isConnected ? '✓' : (warning ? '!' : '●');

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
            className={`px-3 py-2 rounded flex items-center gap-2 ${currentTab === key ? 'bg-neutral text-white' : 'hover-surface'}`}
            onClick={() => onSelect(key)}
            aria-label={key}
          >
            <Icon className="w-5 h-5" />
            <span className="hidden sm:inline">{key}</span>
          </button>
        ))}
        </div>
      </div>
    </div>
  );
}
