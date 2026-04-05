import { motion } from "framer-motion";
import { APP_URL } from "../config/appConfig";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0 },
};

export default function HeroSection() {
  const handleGetStarted = () => {
    window.location.href = APP_URL;
  };

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,_rgba(0,229,255,0.3),_transparent_60%)] blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,_rgba(124,92,255,0.35),_transparent_60%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-12 px-6 pb-20 pt-24 md:flex-row md:items-start md:pt-28">
        <motion.div
          className="max-w-xl flex-1"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            <span>Ship with confidence • AI watching every build</span>
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Fix CI/CD failures
            <span className="block bg-gradient-to-r from-[#00E5FF] via-[#38bdf8] to-[#7C5CFF] bg-clip-text text-transparent">
              before they break production
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-base text-slate-300 sm:text-lg">
            DCPVAS is an AI-powered CI/CD analyzer that watches every run, decodes noisy logs,
            and turns failures into clear explanations and concrete fixes in seconds.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleGetStarted}
              className="rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#7C5CFF] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,92,255,0.7)] transition hover:scale-[1.03] hover:shadow-[0_0_36px_rgba(124,92,255,0.85)] active:scale-[0.98]"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={handleGetStarted}
              className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-slate-100 transition hover:border-white/40 hover:bg-white/10"
            >
              View Dashboard
            </button>
          </div>

          <div className="mt-10 flex flex-wrap gap-8 text-sm text-slate-300">
            <div>
              <p className="text-2xl font-semibold text-white">80%</p>
              <p className="text-xs text-slate-400">Faster incident resolution</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">95%</p>
              <p className="text-xs text-slate-400">AI root-cause accuracy</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">60%</p>
              <p className="text-xs text-slate-400">Less pipeline downtime</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="relative flex-1 max-w-lg"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="absolute -inset-4 rounded-[26px] bg-[radial-gradient(circle_at_top,_rgba(124,92,255,0.65),_transparent_60%)] opacity-60 blur-3xl" />
          <div className="relative rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-2xl backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>main · build #1847</span>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-400/40">
                Monitoring with DCPVAS
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
                <p className="text-slate-400">Total runs</p>
                <p className="mt-1 text-xl font-semibold text-white">326</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
                <p className="text-slate-400">Failures today</p>
                <p className="mt-1 text-xl font-semibold text-rose-300">4</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
                <p className="text-slate-400">Avg fix time</p>
                <p className="mt-1 text-xl font-semibold text-sky-300">7m</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/80 p-3 text-xs">
              <p className="mb-2 text-slate-300">Live pipeline</p>
              <div className="flex flex-wrap gap-2">
                {['Build', 'Test', 'Deploy', 'Verify'].map((stage, idx) => (
                  <div
                    key={stage}
                    className={`rounded-full border px-3 py-1 text-[11px] ${
                      idx < 2
                        ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                        : idx === 2
                          ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                          : 'border-slate-500/40 bg-slate-700/40 text-slate-200'
                    }`}
                  >
                    {stage}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs">
                <p className="text-[11px] font-medium text-emerald-300">AI Status</p>
                <p className="mt-1 text-slate-100">No regressions detected across 24h of runs.</p>
              </div>
              <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-xs">
                <p className="text-[11px] font-medium text-rose-300">Hotspot</p>
                <p className="mt-1 text-slate-100">Deployment memory leak in canary step · 94% confidence.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
