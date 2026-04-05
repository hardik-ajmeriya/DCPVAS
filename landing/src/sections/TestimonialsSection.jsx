import { motion } from "framer-motion";

const testimonials = [
  {
    name: "Head of Platform, Series B SaaS",
    quote:
      "DCPVAS turned our 2am CI firefights into Slack summaries we can action in minutes.",
  },
  {
    name: "DevOps Lead, Fintech",
    quote:
      "We cut mean time to resolution by more than half without changing our pipelines.",
  },
  {
    name: "CTO, Startup",
    quote:
      "It feels like having a senior SRE pair-programming on every deploy.",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">TESTIMONIALS</p>
        <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Teams ship safer with DCPVAS</h2>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {testimonials.map((t) => (
          <motion.figure
            key={t.name}
            className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300 shadow-lg backdrop-blur"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-sm leading-relaxed">“{t.quote}”</p>
            <figcaption className="mt-4 text-xs font-medium text-slate-400">{t.name}</figcaption>
          </motion.figure>
        ))}
      </div>
    </section>
  );
}
