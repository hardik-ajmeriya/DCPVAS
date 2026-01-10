import { useState } from 'react';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Pipelines from './pages/Pipelines.jsx';
import AIInsights from './pages/AIInsights.jsx';
import Settings from './pages/Settings.jsx';
import History from './pages/History.jsx';

export default function App() {
  const [tab, setTab] = useState('Dashboard');
  const [analysisMode, setAnalysisMode] = useState('Rule-Based');

  return (
    <div className="h-screen flex flex-col">
      <Navbar currentTab={tab} onSelect={setTab} />
      <div className="flex flex-1">
        <Sidebar currentTab={tab} onSelect={setTab} />
        <main className="flex-1 p-4 overflow-auto">
          {tab === 'Dashboard' && <Dashboard mode={analysisMode} />}
          {tab === 'Pipelines' && <Pipelines />}
          {tab === 'Execution History' && <History />}
          {tab === 'AI Insights' && <AIInsights />}
          {tab === 'Settings' && (
            <Settings
              mode={analysisMode}
              onModeChange={setAnalysisMode}
            />
          )}
        </main>
      </div>
    </div>
  );
}
