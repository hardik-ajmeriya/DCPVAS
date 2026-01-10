export default function Settings({ mode = 'Rule-Based', onModeChange }) {
  return (
    <div className="p-4 space-y-6">
      <div>
        <div className="text-xl font-semibold">Settings</div>
        <div className="text-sm text-gray-600">Configuration-only (no real calls)</div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <form className="bg-white p-4 rounded shadow space-y-3">
          <div className="font-medium">Jenkins Configuration</div>
          <label className="block text-sm">URL<input className="mt-1 w-full border rounded p-2" placeholder="https://jenkins.example.com" /></label>
          <label className="block text-sm">Job<input className="mt-1 w-full border rounded p-2" placeholder="webapp-main" /></label>
          <label className="block text-sm">Token<input className="mt-1 w-full border rounded p-2" placeholder="********" type="password" /></label>
          <div className="text-xs text-gray-500">Future: Used by backend `jenkinsService`.</div>
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

        
      </div>
    </div>
  );
}
