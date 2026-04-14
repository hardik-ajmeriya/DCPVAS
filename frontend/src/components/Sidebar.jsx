import { Bars3Icon, HomeIcon, Cog6ToothIcon, ListBulletIcon, ChartBarIcon, BugAntIcon, DocumentTextIcon, ExclamationTriangleIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';
import MenuItem from './MenuItem';

const items = [
  { key: 'Dashboard', label: 'Dashboard', icon: HomeIcon },
  { key: 'Pipelines', label: 'Pipelines', icon: ChartBarIcon },
  { key: 'Execution History', label: 'Executions', icon: ListBulletIcon },
  { key: 'Failures', label: 'Failures', icon: ExclamationTriangleIcon },
  { key: 'AI Insights', label: 'AI Insights', icon: BugAntIcon },
  { key: 'Logs', label: 'Logs', icon: DocumentTextIcon },
  { key: 'Settings', label: 'Settings', icon: Cog6ToothIcon },
];

const sections = [
  { title: 'Overview', keys: ['Dashboard', 'Pipelines', 'Execution History'] },
  { title: 'Intelligence', keys: ['Failures', 'AI Insights', 'Logs'] },
  { title: 'System', keys: ['Settings'] },
];

const itemByKey = Object.fromEntries(items.map((item) => [item.key, item]));

export default function Sidebar({ currentTab, onSelect, collapsed, onToggle }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="h-full border-r border-white/10 bg-slate-950 flex flex-col justify-between">
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={onToggle}
          className={`group flex items-center rounded-xl border border-white/10 bg-slate-900/80 text-slate-200 hover:bg-slate-800 transition-all duration-300 ${collapsed ? 'w-12 justify-center px-0 py-2.5' : 'w-full gap-2 px-3 py-2.5'}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Bars3Icon className="h-5 w-5" />
          {!collapsed && <span className="text-sm font-medium">Collapse</span>}
        </button>
      </div>

      <nav className="mt-3 flex-1 overflow-y-auto px-3 pb-3">
        {sections.map((section, index) => (
          <div key={section.title} className={index === 0 ? '' : 'mt-3'}>
            {!collapsed && (
              <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {section.title}
              </div>
            )}

            <div className="space-y-1">
              {section.keys.map((key) => {
                const item = itemByKey[key];
                if (!item) return null;
                return (
                  <MenuItem
                    key={item.key}
                    icon={item.icon}
                    label={item.label}
                    isActive={currentTab === item.key}
                    collapsed={collapsed}
                    onClick={() => onSelect(item.key)}
                  />
                );
              })}
            </div>

            {index < sections.length - 1 && <div className="my-3 border-t border-white/10" />}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <button
          type="button"
          onClick={toggleTheme}
          className={`group relative rounded-xl border border-white/10 bg-slate-900/80 text-slate-200 hover:bg-slate-800 transition-all duration-300 ${collapsed ? 'flex w-12 items-center justify-center px-0 py-2.5' : 'flex w-full items-center justify-between gap-2 px-3 py-2.5'}`}
          title={collapsed ? `Theme: ${theme === 'dark' ? 'Dark' : 'Light'}` : undefined}
        >
          <span className={`flex items-center ${collapsed ? '' : 'gap-2'}`}>
            {theme === 'dark' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
            {!collapsed && <span className="text-xs">Theme: {theme === 'dark' ? 'Dark' : 'Light'}</span>}
          </span>
          {!collapsed && <span className="text-[10px] uppercase tracking-wide text-slate-500">Toggle</span>}

          {collapsed && (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-100 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
            >
              Theme: {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
