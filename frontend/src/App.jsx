import { useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { SignIn, SignUp, useUser } from '@clerk/react';
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
  const { isLoaded, isSignedIn } = useUser();
  const isSignUp = location.pathname.includes('sign-up');

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

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-300">
        Loading authentication...
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-200">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(251,191,36,0.12),transparent_30%),radial-gradient(circle_at_82%_78%,rgba(59,130,246,0.12),transparent_32%),radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_36%)] blur-3xl" />
        <div className="relative min-h-screen flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-6xl grid grid-cols-1 gap-12 items-center md:grid-cols-2">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-amber-400 font-semibold tracking-wide">{isSignUp ? 'Join DCPVAS' : 'DCPVAS'}</div>
              <div className="space-y-3 max-w-xl">
                <h1 className="text-3xl md:text-4xl font-semibold text-white">{isSignUp ? 'Build, Analyze, and Optimize Your CI/CD Pipelines' : 'DevOps CI/CD Pipeline Visualizer'}</h1>
                <p className="text-slate-400 text-base">{isSignUp ? 'Visualize pipelines, detect failures instantly, and get AI-powered root cause analysis across every stage.' : 'Real-time pipeline visibility with AI-driven failure analysis and deep Jenkins integration, tailored for modern DevOps teams.'}</p>
              </div>
              {isSignUp ? (
                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-md space-y-2">
                    <div className="text-xs text-slate-400">Pipeline Visualization</div>
                    <div className="text-lg font-semibold text-white">Commit → Build → Test → Deploy</div>
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="text-amber-300">●</span>
                      <span className="flex-1 h-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400" />
                      <span className="text-emerald-300">●</span>
                    </div>
                    <div className="text-xs text-slate-400">Track every stage from commit to deployment.</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-md space-y-2">
                    <div className="text-xs text-slate-400">AI Failure Detection</div>
                    <div className="text-lg font-semibold text-white">Error detected → Fix suggested</div>
                    <div className="inline-flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-full px-3 py-1">Build stage anomaly</div>
                    <div className="text-xs text-emerald-300">Smart insight: retry with cache purge</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-md space-y-2">
                    <div className="text-xs text-slate-400">Live Monitoring</div>
                    <div className="text-lg font-semibold text-white">Real-time build tracking</div>
                    <div className="inline-flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1">Success · Zero delay</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-md space-y-1">
                      <div className="text-xs text-slate-400">Realtime Pipeline</div>
                      <div className="text-lg font-semibold text-white">Build #248 running</div>
                      <div className="inline-flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1">Deploy 92%</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-md space-y-1">
                      <div className="text-xs text-slate-400">AI Root Cause</div>
                      <div className="text-lg font-semibold text-white">Issue detected in build stage</div>
                      <div className="inline-flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1">Resolved in 1.2m</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-200">
                    <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />Real-time monitoring</div>
                    <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />AI-powered analysis</div>
                    <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />Jenkins integration</div>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-center md:justify-end">
              {isSignUp ? (
                <SignUp
                  appearance={{
                    elements: {
                      rootBox: 'w-full max-w-md',
                      card: 'bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-8 space-y-6',
                      headerTitle: 'text-white text-2xl font-semibold',
                      headerSubtitle: 'text-slate-400 text-sm mt-1',
                      formFieldLabel: 'text-slate-300 text-sm font-medium',
                      formFieldInput: 'bg-slate-800 text-white placeholder:text-slate-400 border border-slate-600 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:ring-offset-0 focus:outline-none transition-colors',
                      formButtonPrimary: 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold rounded-lg py-2.5 shadow-lg shadow-purple-500/25 hover:brightness-110 transition-all duration-200',
                      socialButtonsBlockButton: 'bg-slate-800 text-white border border-slate-600 rounded-lg py-2.5 hover:bg-slate-700 transition-all duration-200',
                      footerActionLink: 'text-amber-400 hover:text-amber-300 transition-colors font-medium',
                    },
                  }}
                  routing="path"
                  path="/sign-up"
                  afterSignInUrl="/"
                  afterSignUpUrl="/"
                />
              ) : (
                <SignIn
                  appearance={{
                    elements: {
                      rootBox: 'w-full max-w-md',
                      card: 'bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-8 space-y-6',
                      headerTitle: 'text-white text-2xl font-semibold',
                      headerSubtitle: 'text-slate-400 text-sm mt-1',
                      formFieldLabel: 'text-slate-300 text-sm font-medium',
                      formFieldInput: 'bg-slate-800 text-white placeholder:text-slate-400 border border-slate-600 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:ring-offset-0 focus:outline-none transition-colors',
                      formButtonPrimary: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold rounded-lg py-2.5 shadow-lg shadow-amber-500/25 hover:brightness-110 transition-all duration-200',
                      socialButtonsBlockButton: 'bg-slate-800 text-white border border-slate-600 rounded-lg py-2.5 hover:bg-slate-700 transition-all duration-200',
                      footerActionLink: 'text-amber-400 hover:text-amber-300 transition-colors font-medium',
                    },
                  }}
                  routing="path"
                  path="/"
                  afterSignInUrl="/"
                  afterSignUpUrl="/"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
