import { useEffect, useState } from "react";

const TARGETS = {
  speed: 80,
  accuracy: 95,
  downtime: 60,
};

export default function StatsSection() {
  const [values, setValues] = useState({ speed: 0, accuracy: 0, downtime: 0 });

  useEffect(() => {
    const duration = 900;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setValues({
        speed: Math.round(TARGETS.speed * ease),
        accuracy: Math.round(TARGETS.accuracy * ease),
        downtime: Math.round(TARGETS.downtime * ease),
      });
      if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, []);

  return (
    <section className="mx-auto max-w-5xl px-6 pb-20">
      <div className="grid gap-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center shadow-[0_20px_70px_rgba(15,23,42,0.9)] sm:grid-cols-3">
        <div>
          <p className="text-4xl font-semibold text-white">{values.speed}%</p>
          <p className="mt-1 text-sm text-slate-400">Faster debugging</p>
        </div>
        <div>
          <p className="text-4xl font-semibold text-white">{values.accuracy}%</p>
          <p className="mt-1 text-sm text-slate-400">AI accuracy on failures</p>
        </div>
        <div>
          <p className="text-4xl font-semibold text-white">{values.downtime}%</p>
          <p className="mt-1 text-sm text-slate-400">Reduction in incidents</p>
        </div>
      </div>
    </section>
  );
}
