import { motion } from "framer-motion";

const problems = [
  {
    title: "Debugging takes hours",
    body: "Engineers jump between Jenkins, Git, and dashboards just to understand why a build failed.",
  },
  {
    title: "Logs are noisy",
    body: "Megabytes of console output hide the real exception behind retries, warnings, and infra noise.",
  },
  {
    title: "Failures are unpredictable",
    body: "Flaky tests and infra blips slip into production because issues aren\'t caught early enough.",
  },
];

export default function ProblemSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-20">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">THE PROBLEM</p>
        <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          CI/CD failures cost you nights and weekends
        </h2>
        <p className="mt-3 text-sm text-slate-400 sm:text-base">
          DCPVAS focuses on the three biggest blockers slowing down modern engineering teams.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {problems.map((item, idx) => (
          <motion.div
            key={item.title}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_18px_60px_rgba(15,23,42,0.9)] backdrop-blur-sm transition hover:border-rose-400/60 hover:bg-white/[0.06] hover:shadow-[0_22px_70px_rgba(15,23,42,0.95)]"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: idx * 0.06 }}
          >
            <div className="mb-3 h-8 w-8 rounded-xl bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/50 flex items-center justify-center text-sm">
              {idx + 1}
            </div>
            <h3 className="text-base font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{item.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
