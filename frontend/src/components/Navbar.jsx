import { useMemo } from 'react';
import { Cog6ToothIcon, ChartBarIcon, ListBulletIcon, LightBulbIcon, PlayCircleIcon } from '@heroicons/react/24/outline';

export default function Navbar({ currentTab, onSelect }) {
  const tabs = useMemo(() => ([
    { key: 'Dashboard', icon: PlayCircleIcon },
    { key: 'Pipelines', icon: ChartBarIcon },
    { key: 'Execution History', icon: ListBulletIcon },
    { key: 'AI Insights', icon: LightBulbIcon },
    { key: 'Settings', icon: Cog6ToothIcon },
  ]), []);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white shadow">
      <div className="text-xl font-semibold">DCPVAS</div>
      <div className="flex gap-2">
        {tabs.map(({ key, icon: Icon }) => (
          <button
            key={key}
            className={`px-3 py-2 rounded flex items-center gap-2 ${currentTab === key ? 'bg-neutral text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={() => onSelect(key)}
            aria-label={key}
          >
            <Icon className="w-5 h-5" />
            <span className="hidden sm:inline">{key}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
