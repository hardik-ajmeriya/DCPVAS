export default function AIInsights() {
  return (
    <div className="p-4 space-y-2">
      <div className="text-xl font-semibold">AI Insights</div>
      <div className="bg-white p-4 rounded shadow text-sm text-gray-700">
        <div className="mb-2">AI-assisted summaries provide suggested wording only. They are not guaranteed to be accurate. Use them to guide investigation, not as final truth.</div>
        <ul className="list-disc pl-6">
          <li>Identify common failure patterns across runs.</li>
          <li>Surface frequent error keywords and stages.</li>
          <li>Offer concise suggested summaries for dashboards.</li>
        </ul>
      </div>
    </div>
  );
}
