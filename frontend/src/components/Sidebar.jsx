import { HomeIcon, Cog6ToothIcon, ListBulletIcon, ChartBarIcon, BugAntIcon, DocumentTextIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// Map new labels to existing tabs/pages
const items = [
  { key: 'Dashboard', label: 'Dashboard', icon: HomeIcon },
  { key: 'Pipelines', label: 'Pipelines', icon: ChartBarIcon },
  { key: 'Execution History', label: 'Executions', icon: ListBulletIcon },
  { key: 'Failures', label: 'Failures', icon: ExclamationTriangleIcon },
  { key: 'AI Insights', label: 'AI Insights', icon: BugAntIcon },
  { key: 'Logs', label: 'Logs', icon: DocumentTextIcon },
  { key: 'Settings', label: 'Settings', icon: Cog6ToothIcon },
];

export default function Sidebar({ currentTab, onSelect }) {
  return (
    <aside className="w-64 border-r border-[var(--border-color)] bg-[var(--bg-secondary)]">
      <nav className="flex flex-col py-4">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`flex items-center gap-3 px-4 py-3 text-left hover-surface ${currentTab === key ? 'active-surface' : ''}`}
          >
            <Icon className="w-5 h-5 text-gray-400" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
