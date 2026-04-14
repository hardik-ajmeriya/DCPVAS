import { useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import Dashboard from '../pages/Dashboard';
import Pipelines from '../pages/Pipelines';
import AIInsights from '../pages/AIInsights';
import Settings from '../pages/Settings';
import History from '../pages/History';
import BuildDetails from '../pages/BuildDetails';
import Failures from '../pages/Failures';
import LogsPage from '../pages/LogsPage';

export default function AppLayout() {
  const [analysisMode, setAnalysisMode] = useState('Rule-Based');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = useMemo(
    () => [
      { key: 'Dashboard', path: '/', element: <Dashboard mode={analysisMode} /> },
      { key: 'Pipelines', path: '/pipelines', element: <Pipelines /> },
      { key: 'Execution History', path: '/history', element: <History /> },
      { key: 'Failures', path: '/failures', element: <Failures /> },
      { key: 'AI Insights', path: '/insights', element: <AIInsights /> },
      { key: 'Logs', path: '/logs', element: <LogsPage /> },
      {
        key: 'Settings',
        path: '/settings',
        element: <Settings mode={analysisMode} onModeChange={setAnalysisMode} />,
      },
    ],
    [analysisMode]
  );

  const currentTab = useMemo(() => {
    const found = tabs.find((t) => t.path === location.pathname);
    if (found) return found.key;
    if (location.pathname.startsWith('/pipelines')) return 'Pipelines';
    if (location.pathname.startsWith('/history')) return 'Execution History';
    if (location.pathname.startsWith('/failures')) return 'Failures';
    if (location.pathname.startsWith('/insights')) return 'AI Insights';
    if (location.pathname.startsWith('/logs')) return 'Logs';
    if (location.pathname.startsWith('/settings')) return 'Settings';
    return 'Dashboard';
  }, [location.pathname, tabs]);

  const handleSelect = (key) => {
    const target = tabs.find((t) => t.key === key);
    if (target) navigate(target.path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] text-gray-900 dark:text-gray-100">
      <header className="fixed top-0 left-0 w-full h-[72px] md:h-[88px] z-50 border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-slate-950/90 backdrop-blur">
        <Topbar currentTab={currentTab} onSelect={handleSelect} />
      </header>

      <aside
        className={`fixed top-[72px] md:top-[88px] left-0 h-[calc(100vh-72px)] md:h-[calc(100vh-88px)] z-40 transition-[width] duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <Sidebar
          currentTab={currentTab}
          onSelect={handleSelect}
          collapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
        />
      </aside>

      <main
        className={`mt-[72px] md:mt-[88px] h-[calc(100vh-72px)] md:h-[calc(100vh-88px)] overflow-y-auto transition-[margin] duration-300 ease-in-out ${
          isSidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <Routes>
          {tabs.map(({ key, path, element }) => (
            <Route key={key} path={path} element={element} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
