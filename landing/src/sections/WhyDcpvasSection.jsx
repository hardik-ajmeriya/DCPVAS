import { motion } from "framer-motion";

const items = [
  {
    title: "Traditional CI dashboards",
    body: "Show you red/green status but leave you digging through raw logs to understand why.",
  },
  {
    title: "Generic log search",
    body: "Great for grep; not great at understanding deploy stages, flaky tests, or rollout strategy.",
  },
  {
    title: "DCPVAS",
    body: "Purpose-built AI for CI/CD that understands pipelines, correlates runs, and proposes fixes.",
    highlight: true,
  },
];

export default function WhyDcpvasSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">WHY DCPVAS</p>
        <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Built for modern DevOps teams</h2>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {items.map((item) => (
          <motion.div
            key={item.title}
            className={`rounded-2xl border p-5 text-sm shadow-[0_18px_60px_rgba(15,23,42,0.9)] backdrop-blur ${
              item.highlight
                ? 'border-[#7C5CFF]/70 bg-[#020617]/80'
                : 'border-white/10 bg-white/[0.03]'
            }`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4 }}
          >
            <p className={`text-xs font-semibold ${item.highlight ? 'text-[#7C5CFF]' : 'text-slate-400'}`}>
              {item.highlight ? 'DCPVAS' : 'Alternative'}
            </p>
            <h3 className="mt-2 text-base font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-slate-300">{item.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
