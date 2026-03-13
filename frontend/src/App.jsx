import { useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Topbar from './components/Topbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Pipelines from './pages/Pipelines.jsx';
import AIInsights from './pages/AIInsights.jsx';
import Settings from './pages/Settings.jsx';
import History from './pages/History.jsx';
import BuildDetails from './pages/BuildDetails.jsx';
import Failures from './pages/Failures.jsx';
import { useLatestBuildQuery } from './services/queries.js';

function LatestLogs() {
  const { data } = useLatestBuildQuery();
  const n = Number(data?.buildNumber);
  return <BuildDetails buildNumber={Number.isFinite(n) ? n : undefined} />;
}

export default function App() {
  const [analysisMode, setAnalysisMode] = useState('Rule-Based');
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = useMemo(() => ([
    { key: 'Dashboard', path: '/', element: <Dashboard mode={analysisMode} /> },
    { key: 'Pipelines', path: '/pipelines', element: <Pipelines /> },
    { key: 'Execution History', path: '/history', element: <History /> },
    { key: 'Failures', path: '/failures', element: <Failures /> },
    { key: 'AI Insights', path: '/insights', element: <AIInsights /> },
    { key: 'Logs', path: '/logs', element: <LatestLogs /> },
    { key: 'Settings', path: '/settings', element: (
      <Settings
        mode={analysisMode}
        onModeChange={setAnalysisMode}
      />
    ) },
  ]), [analysisMode]);

  const currentTab = useMemo(() => {
    const found = tabs.find((t) => t.path === location.pathname);
    if (found) return found.key;
    // fallback: match by segment
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
    <div className="h-screen flex flex-col">
      <Topbar currentTab={currentTab} onSelect={handleSelect} />
      <div className="flex flex-1">
        <Sidebar currentTab={currentTab} onSelect={handleSelect} />
        <main className="flex-1 p-4 overflow-auto">
          <Routes>
            {tabs.map(({ key, path, element }) => (
              <Route key={key} path={path} element={element} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
