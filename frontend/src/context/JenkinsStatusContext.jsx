import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { getJenkinsSettings } from '../services/settingsService.js';

const JenkinsStatusContext = createContext(null);

export function JenkinsStatusProvider({ children }) {
  const [isConnected, setIsConnected] = useState(null); // null = unknown
  const [jobName, setJobName] = useState(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState(null);
  const [warning, setWarning] = useState(false); // true when backend unreachable

  const setStatus = useCallback((payload) => {
    const {
      isConnected: connected,
      jobName: jName,
      lastVerifiedAt: verifiedAt,
    } = payload || {};
    if (typeof connected === 'boolean') setIsConnected(connected);
    if (typeof jName === 'string') setJobName(jName || null);
    if (typeof verifiedAt === 'string') setLastVerifiedAt(verifiedAt || null);
    setWarning(false);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await getJenkinsSettings();
      setIsConnected(Boolean(data?.isConnected));
      setJobName(data?.jobName || null);
      setLastVerifiedAt(data?.lastVerifiedAt || null);
      setWarning(false);
      return data;
    } catch (err) {
      // Backend unreachable or error: mark as disconnected with warning
      setIsConnected(false);
      setWarning(true);
      return null;
    }
  }, []);

  useEffect(() => {
    // Fetch once on app load; no polling
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({
    isConnected,
    jobName,
    lastVerifiedAt,
    warning,
    setStatus,
    refresh,
  }), [isConnected, jobName, lastVerifiedAt, warning, setStatus, refresh]);

  return (
    <JenkinsStatusContext.Provider value={value}>
      {children}
    </JenkinsStatusContext.Provider>
  );
}

export function useJenkinsStatus() {
  const ctx = useContext(JenkinsStatusContext);
  if (!ctx) throw new Error('useJenkinsStatus must be used within JenkinsStatusProvider');
  return ctx;
}
