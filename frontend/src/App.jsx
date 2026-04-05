import { useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { SignIn, SignUp, useUser } from '@clerk/react';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Pipelines from './pages/Pipelines';
import AIInsights from './pages/AIInsights';
import Settings from './pages/Settings';
import History from './pages/History';
import BuildDetails from './pages/BuildDetails';
import Failures from './pages/Failures';
import LogsPage from './pages/LogsPage';

export default function App() {
  const [analysisMode, setAnalysisMode] = useState('Rule-Based');
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useUser();
  const isSignUp = location.pathname.includes('sign-up');

  const authAppearance = {
    variables: {
      colorPrimary: '#22d3ee',
      colorBackground: 'transparent',
      colorText: '#e5e7eb',
      colorTextSecondary: '#cbd5f5',
      colorInputBackground: '#020617',
      colorInputText: '#e5e7eb',
    },
    elements: {
      rootBox: 'w-full',
      card: 'bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none rounded-2xl p-8',
      headerTitle: 'text-gray-900 dark:text-gray-100 text-2xl font-semibold',
      headerSubtitle: 'text-slate-200',
      identityPreview: 'text-cyan-100',
      identityPreviewEditButton: 'text-cyan-200 hover:text-cyan-100',
      formFieldLabel: 'text-slate-100 text-sm font-semibold',
      formFieldLabelRow: 'flex items-center justify-between text-slate-200 text-sm font-semibold',
      formFieldHintText: 'text-slate-200/90 text-xs',
      formFieldInput: 'bg-gray-100 dark:bg-white/5 text-black dark:text-white placeholder:text-gray-500 dark:placeholder:text-slate-400 border border-gray-300 dark:border-white/15 rounded-lg focus:border-blue-600 dark:focus:border-cyan-300 focus:ring-2 focus:ring-blue-700/80 dark:focus:ring-cyan-400/80',
      formFieldInputShowPasswordIcon: 'text-slate-200',
      formFieldAction: 'text-cyan-200 hover:text-cyan-100',
      formButtonSecondary: 'text-slate-200',
      formButtonPrimary: 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-semibold rounded-lg hover:opacity-90 transition',
      socialButtonsBlockButton: 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10',
      dividerLine: 'bg-gray-200 dark:bg-white/10',
      dividerText: 'text-slate-200',
      footerActionText: 'text-slate-100',
      footerActionLink: 'text-cyan-200 hover:text-cyan-100',
      footer: 'text-slate-100',
    },
  };

  const tabs = useMemo(() => ([
    { key: 'Dashboard', path: '/', element: <Dashboard mode={analysisMode} /> },
    { key: 'Pipelines', path: '/pipelines', element: <Pipelines /> },
    { key: 'Execution History', path: '/history', element: <History /> },
    { key: 'Failures', path: '/failures', element: <Failures /> },
    { key: 'AI Insights', path: '/insights', element: <AIInsights /> },
    { key: 'Logs', path: '/logs', element: <LogsPage /> },
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
      <div className="relative min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#020617] bg-gradient-to-br from-blue-100 to-purple-100 dark:from-[#020617] dark:via-[#030b2a] dark:to-[#030712] text-gray-900 dark:text-white overflow-hidden px-6 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.18),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.18),transparent_42%),radial-gradient(circle_at_50%_40%,rgba(34,211,238,0.14),transparent_38%)] blur-3xl" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0)_40%),linear-gradient(300deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0)_45%)]" />

        <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 gap-10 items-center md:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-cyan-700 dark:text-cyan-300 font-semibold tracking-wide bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-3 py-1 rounded-full backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
              {isSignUp ? 'Join DCPVAS' : 'Welcome back to DCPVAS'}
            </div>
            <div className="space-y-3 max-w-xl">
              <h1 className="text-3xl md:text-4xl font-semibold leading-tight text-gray-900 dark:text-white">
                {isSignUp ? 'Build, analyze, and secure your CI/CD pipelines with AI.' : 'AI-native DevOps cockpit for pipelines, failures, and insights.'}
              </h1>
              <p className="text-gray-600 dark:text-slate-300 text-base">
                Debug faster with AI-assisted triage, neon-clear dashboards, and zero-click root cause suggestions tailored for modern delivery teams.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-4 shadow-sm dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                <div className="text-xs text-cyan-700 dark:text-cyan-200/80">Live Pipelines</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">Deploy · Test · Verify</div>
                <div className="mt-2 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 shadow-[0_0_16px_rgba(56,189,248,0.6)]" />
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-xl p-4 shadow-sm dark:shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                <div className="text-xs text-purple-700 dark:text-purple-200/80">AI Signal</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">Root cause in seconds</div>
                <div className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 rounded-full px-3 py-1">Auto fix suggestion</div>
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-md mx-auto">
            <div className="absolute -inset-6 rounded-[28px] bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.22),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(139,92,246,0.18),transparent_40%)] blur-3xl" />
            <div className="relative z-10">
              {isSignUp ? (
                <SignUp
                  appearance={authAppearance}
                  routing="path"
                  path="/sign-up"
                  afterSignInUrl="/"
                  afterSignUpUrl="/"
                />
              ) : (
                <SignIn
                  appearance={authAppearance}
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] text-gray-900 dark:text-gray-100">
      {/* Fixed navbar */}
      <header className="fixed top-0 left-0 w-full h-16 z-50 border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-slate-950/90 backdrop-blur">
        <Topbar currentTab={currentTab} onSelect={handleSelect} />
      </header>

      {/* Fixed sidebar */}
      <aside className="fixed top-16 left-0 h-[calc(100vh-64px)] w-64 z-40 border-r border-gray-200 dark:border-white/10 bg-white dark:bg-[var(--bg-secondary)]">
        <Sidebar currentTab={currentTab} onSelect={handleSelect} />
      </aside>

      {/* Scrollable main content */}
      <main className="ml-64 mt-16 h-[calc(100vh-64px)] overflow-y-auto">
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
