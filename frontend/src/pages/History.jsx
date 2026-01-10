import { useEffect, useState } from 'react';
import FailureTimeline from '../components/FailureTimeline.jsx';
import FailureAnalysis from '../components/FailureAnalysis.jsx';
import { getPipelineHistory, getPipelineBuild } from '../services/api.js';
import axios from 'axios';

export default function History() {
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        // Fetch failure timeline from backend for richer insights
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
        const { data } = await axios.get(`${base}/pipeline/failures`, { params: { limit: 'all' } });
        const items = Array.isArray(data?.timeline) ? data.timeline : [];
        setList(items);
        if (!selected && items.length) {
          const detail = await getPipelineBuild(items[0].buildNumber);
          setSelected(detail);
        }
      } catch (e) {
        console.error('Failed to load executions:', e?.message || e);
      }
    }
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [selected]);

  const onSelect = async (item) => {
    try {
      const detail = await getPipelineBuild(item.buildNumber);
      setSelected(detail);
    } catch (e) {
      console.error('Failed to load execution:', e?.message || e);
    }
  };

  const onOpenLogs = async (item) => {
    try {
      const detail = await getPipelineBuild(item.buildNumber);
      setSelected(detail);
    } catch (e) {
      console.error('Failed to load logs:', e?.message || e);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-xl font-semibold">Execution History</div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <FailureTimeline items={list} onSelect={onSelect} onOpenLogs={onOpenLogs} />
        </div>
        <div className="md:col-span-2">
          {selected && <FailureAnalysis run={selected} />}
        </div>
      </div>
    </div>
  );
}
