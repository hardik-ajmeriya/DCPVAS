import { useEffect, useMemo, useState } from 'react';
import { useJenkinsStatus } from '../context/JenkinsStatusContext.jsx';
import { getJenkinsSettings, saveJenkinsSettings, testJenkinsConnection } from '../services/settingsService.js';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Settings({ mode = 'Rule-Based', onModeChange }) {
  const { setStatus, refresh } = useJenkinsStatus();
  const { theme, toggleTheme, setTheme } = useTheme();
  const [jenkinsUrl, setJenkinsUrl] = useState('');
  const [jobName, setJobName] = useState('');
  const [username, setUsername] = useState('');
  const [apiToken, setApiToken] = useState('');

  const [step, setStep] = useState('idle'); // idle | saving | verifying
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // info | success | error

  const canSubmit = useMemo(() => {
    return Boolean(jenkinsUrl && jobName && username && apiToken) && step === 'idle';
  }, [jenkinsUrl, jobName, username, apiToken, step]);

  useEffect(() => {
    // Initial prefill from backend; token remains empty
    (async () => {
      try {
        const data = await getJenkinsSettings();
        setJenkinsUrl(data?.jenkinsUrl || '');
        setJobName(data?.jobName || '');
        setUsername(data?.username || '');
        // Do not prefill token
      } catch (err) {
        // Silent; global context already handles warning badge
      }
    })();
  }, []);

  async function handleSaveAndConnect(e) {
    e?.preventDefault?.();
    if (!canSubmit) return;
    setMessageType('info');
    setMessage('Saving configuration...');
    setStep('saving');
    try {
      await saveJenkinsSettings({ jenkinsUrl, jobName, username, apiToken });
      setMessage('Verifying Jenkins connection...');
      setStep('verifying');

      try {
        const testResult = await testJenkinsConnection({ jenkinsUrl, username, apiToken });
        // Update global status optimistically based on test result if possible
        const connected = Boolean(testResult?.isConnected ?? testResult?.success ?? true);
        const verifiedAt = testResult?.verifiedAt || testResult?.lastVerifiedAt;
        setStatus({ isConnected: connected, jobName, lastVerifiedAt: verifiedAt });
        // Ensure full sync with backend state
        await refresh();

        setMessageType('success');
        setMessage('Jenkins connected successfully');
        setApiToken(''); // clear token from input
      } catch (verifyErr) {
        setStatus({ isConnected: false, jobName });
        setMessageType('error');
        setMessage(verifyErr?.response?.data?.message || 'Failed to verify Jenkins connection');
      }
    } catch (saveErr) {
      setMessageType('error');
      const status = saveErr?.response?.status;
      if (status === 404) {
        setMessage('Settings API not available. Backend route missing.');
      } else {
        setMessage(saveErr?.response?.data?.message || 'Failed to save Jenkins configuration');
      }
    } finally {
      setStep('idle');
    }
  }

  const buttonLabel = step === 'saving'
    ? 'Saving configuration...'
    : step === 'verifying'
      ? 'Verifying Jenkins connection...'
      : 'Save & Connect';

  return (
    <div className="p-4 space-y-6">
      <div>
        <div className="text-xl font-semibold">Settings</div>
        <div className="text-sm text-gray-600">Configure Jenkins and analysis behavior</div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <form className="bg-white p-4 rounded shadow space-y-3" onSubmit={handleSaveAndConnect}>
          <div className="font-medium">Jenkins Configuration</div>

          <label className="block text-sm">
            URL
            <input
              className="mt-1 w-full border rounded p-2"
              placeholder="https://jenkins.example.com"
              value={jenkinsUrl}
              onChange={(e) => setJenkinsUrl(e.target.value)}
              type="url"
              required
            />
          </label>

          <label className="block text-sm">
            Job Name
            <input
              className="mt-1 w-full border rounded p-2"
              placeholder="example-pipeline"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm">
            Username
            <input
              className="mt-1 w-full border rounded p-2"
              placeholder="jenkins-user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label className="block text-sm">
            API Token
            <input
              className="mt-1 w-full border rounded p-2"
              placeholder="********"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              type="password"
              required
            />
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className={`px-4 py-2 rounded text-white ${canSubmit ? 'bg-neutral hover:opacity-90' : 'bg-gray-300 cursor-not-allowed'}`}
              disabled={!canSubmit}
            >
              {buttonLabel}
            </button>
            {message && (
              <span className={`text-sm ${messageType === 'success' ? 'text-success' : messageType === 'error' ? 'text-failure' : 'text-gray-600'}`}>
                {message}
              </span>
            )}
          </div>

          <div className="text-xs text-gray-500">Token is stored encrypted by the backend.</div>
        </form>

        <form className="bg-white p-4 rounded shadow space-y-3">
          <div className="font-medium">GitHub Configuration</div>
          <label className="block text-sm">Repository<input className="mt-1 w-full border rounded p-2" placeholder="org/repo" /></label>
          <label className="block text-sm">Token<input className="mt-1 w-full border rounded p-2" placeholder="********" type="password" /></label>
          <div className="text-xs text-gray-500">Future: May power insights or metadata.</div>
        </form>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow space-y-3">
          <div className="font-medium">Analysis Mode</div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="analysis"
                checked={mode === 'Rule-Based'}
                onChange={() => onModeChange?.('Rule-Based')}
              />
              Rule-Based
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="analysis"
                checked={mode === 'AI-Assisted'}
                onChange={() => onModeChange?.('AI-Assisted')}
              />
              AI-Assisted
            </label>
          </div>
          <div className="text-xs text-gray-500">AI output is labeled as suggested.</div>
        </div>

        <div className="bg-white p-4 rounded shadow space-y-3">
          <div className="font-medium">Theme</div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="theme"
                checked={theme === 'light'}
                onChange={() => setTheme('light')}
              />
              Light
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="theme"
                checked={theme === 'dark'}
                onChange={() => setTheme('dark')}
              />
              Dark
            </label>
            <button type="button" className="px-3 py-1 rounded border" onClick={toggleTheme}>
              Toggle
            </button>
          </div>
          <div className="text-xs text-gray-500">Current: {theme?.toUpperCase?.() || 'LIGHT'}. Theme is saved and applies instantly.</div>
        </div>
      </div>
    </div>
  );
}
