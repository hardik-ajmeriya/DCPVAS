import { HomeIcon, Cog6ToothIcon, ListBulletIcon, ChartBarIcon, BugAntIcon, DocumentTextIcon, ExclamationTriangleIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="w-64 border-r border-gray-200 dark:border-white/10 bg-white dark:bg-[#020617] flex flex-col justify-between">
      <nav className="flex flex-col py-4">
        {items.map(({ key, label, icon: Icon }) => {
          const isActive = currentTab === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`group relative flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 ease-in-out
                ${isActive
                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-medium border-l-4 border-blue-500'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-white/10 hover:text-blue-600 dark:hover:text-white'}
              `}
            >
              <Icon className="w-5 h-5 text-gray-500 group-hover:text-blue-500" />
              <span className="text-sm truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 dark:border-white/10 px-3 py-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <span className="flex items-center gap-2">
            {theme === 'dark' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
            <span>Theme: {theme === 'dark' ? 'Dark' : 'Light'}</span>
          </span>
          <span className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Toggle</span>
        </button>
      </div>
    </aside>
  );
}
