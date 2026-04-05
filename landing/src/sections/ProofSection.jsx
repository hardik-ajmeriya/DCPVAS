import { motion } from "framer-motion";

const stats = [
  { label: "Faster debugging", value: "80%" },
  { label: "AI accuracy", value: "95%" },
  { label: "Less downtime", value: "60%" },
];

const testimonials = [
  {
    quote: "Saved hours of debugging time on every bad deploy.",
    role: "Staff DevOps Engineer",
  },
  {
    quote: "Finally, CI logs make sense instead of being noise.",
    role: "Backend Tech Lead",
  },
];

const container = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.08, duration: 0.45 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export default function ProofSection() {
  return (
		<section id="proof" className="mx-auto max-w-6xl px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <h2 className="text-3xl font-semibold text-white sm:text-4xl">Real Impact for Your Team</h2>
        <p className="mt-3 text-sm text-slate-400 sm:text-base">
          Why high-performing DevOps teams trust DCPVAS in production.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="grid gap-4 sm:grid-cols-3 mb-12"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={item}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="rounded-xl border border-white/10 bg-white/[0.05] p-6 text-center shadow-[0_18px_45px_rgba(15,23,42,0.8)] backdrop-blur"
          >
            <div className="text-3xl font-semibold text-white">{stat.value}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Before vs After impact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45 }}
        className="grid gap-6 md:grid-cols-2 mb-12"
      >
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-200 shadow-[0_16px_40px_rgba(15,23,42,0.9)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Before DCPVAS</p>
          <h3 className="mt-2 text-base font-medium text-white">Manual log digging for every failed build</h3>
          <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
            <li>• Engineers scroll through thousands of log lines per incident.</li>
            <li>• Root cause analysis can take 30–90 minutes per failure.</li>
            <li>• Fixes live in tribal knowledge or old Slack threads.</li>
          </ul>
        </div>
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-5 text-sm text-emerald-50 shadow-[0_18px_45px_rgba(16,185,129,0.55)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">After DCPVAS</p>
          <h3 className="mt-2 text-base font-medium text-white">AI summaries and fixes in seconds</h3>
          <ul className="mt-3 space-y-1.5 text-xs text-emerald-50/90">
            <li>• Every failure gets a human-readable summary and impact.</li>
            <li>• Suggested fixes and technical diffs are generated automatically.</li>
            <li>• Teams close incidents faster and ship more often with confidence.</li>
          </ul>
        </div>
      </motion.div>

      {/* Testimonials */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45 }}
        className="grid gap-4 md:grid-cols-2"
      >
        {testimonials.map((t) => (
          <div
            key={t.quote}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.85)] backdrop-blur transition hover:-translate-y-1 hover:border-[#7C5CFF]/70 hover:shadow-[0_20px_60px_rgba(124,92,255,0.6)]"
          >
            <p className="text-slate-100">“{t.quote}”</p>
            <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">{t.role}</p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
