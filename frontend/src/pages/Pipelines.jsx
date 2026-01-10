import { useEffect, useState } from 'react';
import PipelineGraph from '../components/PipelineGraph.jsx';

export default function Pipelines() {
  const [run, setRun] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('http://localhost:4000/api/pipeline/latest');
        if (!res.ok) throw new Error('Failed to fetch latest pipeline');
        const data = await res.json();
        console.log('LIVE JENKINS DATA', data);
        setRun(data);
      } catch (e) {
        console.error('Failed to load pipelines:', e?.message || e);
      }
    }
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="text-xl font-semibold">Pipelines</div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-3">
          <PipelineGraph run={run} />
        </div>
      </div>
    </div>
  );
}
