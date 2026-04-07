import { useEffect, useMemo, useState } from 'react';
import { getJenkinsSettings, saveJenkinsSettings, testJenkinsConnection } from '../services/settingsService.js';
import { useJenkinsStatus } from '../context/JenkinsStatusContext';

export default function Settings() {
  const { setStatus, refresh } = useJenkinsStatus();
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
    <div className="px-4 py-4 lg:py-6 flex justify-center">
      <div className="w-full max-w-xl space-y-5">
        <div>
          <div className="text-xl font-semibold">Settings</div>
          <div className="text-sm text-gray-500">Configure Jenkins connection settings</div>
        </div>

        <form
          className="bg-white/95 dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-800/80 rounded-lg shadow-sm p-4 md:p-5 space-y-3 flex flex-col"
          onSubmit={handleSaveAndConnect}
        >
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

          <div className="flex items-center gap-3 pt-2 mt-auto">
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
      </div>
    </div>
  );
}
