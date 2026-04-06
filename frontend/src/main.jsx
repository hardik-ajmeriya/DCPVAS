import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { JenkinsStatusProvider } from './context/JenkinsStatusContext';
import { ThemeProvider } from './context/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react';
import { getSocket } from './services/socket.js';
import { qk } from './services/queries.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function Root() {
  useEffect(() => {
    const socket = getSocket();
    const onReconnectGeneric = () => {
      queryClient.invalidateQueries({ queryKey: qk.latest });
    };
    const onBuildNew = (payload) => {
      queryClient.invalidateQueries({ queryKey: qk.latest });
      const n = Number(payload?.buildNumber);
      if (Number.isFinite(n) && n > 0) {
        queryClient.invalidateQueries({ queryKey: qk.build(n) });
        queryClient.invalidateQueries({ queryKey: qk.analysis(n) });
      }
    };
    const onBuildCompleted = (payload) => {
      const n = Number(payload?.buildNumber);
      if (Number.isFinite(n) && n > 0) {
        queryClient.invalidateQueries({ queryKey: qk.build(n) });
        queryClient.invalidateQueries({ queryKey: qk.analysis(n) });
      }
    };
    const onLogsComplete = (payload) => {
      const n = Number(payload?.buildNumber);
      if (Number.isFinite(n) && n > 0) {
        queryClient.setQueryData(qk.build(n), (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            logs: String(payload?.logs || prev.logs || ''),
            logsFinal: true,
            buildStatus: 'COMPLETED',
          };
        });
      }
    };
    const onAnalysisProgress = (payload) => {
      const n = Number(payload?.buildNumber);
      const step = String(payload?.stage || payload?.status || 'AI_ANALYZING');
      if (Number.isFinite(n) && n > 0) {
        queryClient.setQueryData(qk.analysis(n), step);
        queryClient.invalidateQueries({ queryKey: qk.analysis(n) });
      }
    };
    const onAnalysisCompleted = (payload) => {
      const n = Number(payload?.buildNumber);
      if (Number.isFinite(n) && n > 0) {
        queryClient.setQueryData(qk.analysis(n), 'COMPLETED');
        queryClient.invalidateQueries({ queryKey: qk.analysis(n) });
        queryClient.invalidateQueries({ queryKey: qk.build(n) });
      }
    };

    socket.on('build:new', onBuildNew);
    socket.on('build:completed', onBuildCompleted);
    socket.on('logs:complete', onLogsComplete);
    socket.on('logs:completed', onLogsComplete);
    socket.on('analysis:progress', onAnalysisProgress);
    socket.on('analysis:completed', onAnalysisCompleted);
    socket.on('analysis:complete', onAnalysisCompleted);
    socket.on('connect', onReconnectGeneric);
    socket.on('reconnect', onReconnectGeneric);

    return () => {
      socket.off('build:new', onBuildNew);
      socket.off('build:completed', onBuildCompleted);
      socket.off('logs:complete', onLogsComplete);
      socket.off('logs:completed', onLogsComplete);
      socket.off('analysis:progress', onAnalysisProgress);
      socket.off('analysis:completed', onAnalysisCompleted);
      socket.off('analysis:complete', onAnalysisCompleted);
      socket.off('connect', onReconnectGeneric);
      socket.off('reconnect', onReconnectGeneric);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <JenkinsStatusProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </JenkinsStatusProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <Root />
    </ClerkProvider>
  </React.StrictMode>
);