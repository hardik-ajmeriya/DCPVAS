import { motion } from "framer-motion";

const features = [
  "Understands your stages, jobs, and environments — not just raw text.",
  "Detects patterns across runs to highlight flaky tests and failing services.",
  "Explains failures in human language your whole team can understand.",
  "Generates concrete remediation steps tailored to your stack.",
];

const steps = [
  "CI/CD",
  "Logs",
  "AI Engine",
  "Insights",
];

export default function SolutionSection() {
  return (
		<section id="features" className="mx-auto max-w-6xl px-6 pb-20">
      <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr] items-start">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45 }}
        >
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">THE SOLUTION</p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Intelligence that understands your pipelines
          </h2>
          <p className="mt-3 text-sm text-slate-400 sm:text-base">
            DCPVAS connects to your CI/CD provider, ingests logs and metadata, and applies a domain-tuned AI engine
            to surface exactly what went wrong — and how to fix it.
          </p>

          <ul className="mt-6 space-y-3 text-sm text-slate-300">
            {features.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#00E5FF]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_20px_70px_rgba(15,23,42,0.9)] backdrop-blur"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-medium text-slate-300">Signal flow</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-200">
            {steps.map((step, idx) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`flex h-8 items-center justify-center rounded-full border px-3 ${
                    idx === 2
                      ? 'border-[#7C5CFF]/70 bg-[#7C5CFF]/10 text-[#E5E0FF]'
                      : 'border-white/15 bg-white/[0.03]'
                  }`}
                >
                  {step}
                </div>
                {idx !== steps.length - 1 && (
                  <span className="text-slate-500">→</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 text-xs text-slate-200 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-4">
              <p className="text-[11px] font-semibold text-emerald-300">Real-time guardrails</p>
              <p className="mt-2 text-[13px]">
                DCPVAS flags risky changes before they merge, using historical failures and infra health.
              </p>
            </div>
            <div className="rounded-xl border border-sky-400/40 bg-sky-500/10 p-4">
              <p className="text-[11px] font-semibold text-sky-300">Always-on context</p>
              <p className="mt-2 text-[13px]">
                Enriches failures with commit metadata, owners, and related incidents for faster triage.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
