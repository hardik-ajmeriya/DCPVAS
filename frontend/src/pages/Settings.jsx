import { useEffect, useMemo, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
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
              className={`px-4 py-2 rounded font-medium transition-all duration-200 ease-in-out ${canSubmit ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
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
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-gray-600">
              Toggle between light and dark themes.
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="relative inline-flex items-center h-10 w-24 rounded-full border border-blue-500/60 bg-slate-900/80 px-1 shadow-[0_0_0_1px_rgba(59,130,246,0.4)] transition-colors duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:ring-offset-2 focus:ring-offset-slate-950"
              aria-label="Toggle light and dark theme"
            >
              <div className="flex-1 flex items-center justify-between px-2 text-[11px] font-medium tracking-[0.14em] uppercase text-slate-200">
                <Sun className="w-3.5 h-3.5" />
                <span className="mx-1">D/L</span>
                <Moon className="w-3.5 h-3.5" />
              </div>
              <div
                className={`absolute inset-y-1 w-8 rounded-full bg-slate-800 text-sky-300 flex items-center justify-center transition-transform duration-300 ease-out ${
                  theme === 'dark' ? 'translate-x-12' : 'translate-x-0'
                }`}
              >
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-300" />}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
