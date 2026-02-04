import { HomeIcon, Cog6ToothIcon, ListBulletIcon, ChartBarIcon, LightBulbIcon } from '@heroicons/react/24/outline';

const items = [
  { key: 'Dashboard', icon: HomeIcon },
  { key: 'Pipelines', icon: ChartBarIcon },
  { key: 'Execution History', icon: ListBulletIcon },
  { key: 'AI Insights', icon: LightBulbIcon },
  { key: 'Settings', icon: Cog6ToothIcon },
];

export default function Sidebar({ currentTab, onSelect }) {
  return (
    <aside className="w-56 bg-white border-r">
      <div className="p-4 font-semibold">Navigation</div>
      <nav className="flex flex-col">
        {items.map(({ key, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex items-center gap-3 px-4 py-2 text-left hover-surface ${currentTab === key ? 'active-surface' : ''}`}
          >
            <Icon className="w-5 h-5" />
            <span>{key}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
