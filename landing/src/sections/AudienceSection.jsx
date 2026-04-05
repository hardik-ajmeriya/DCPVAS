import { motion } from "framer-motion";

const roles = [
  {
    title: "DevOps & SRE teams",
    body: "Stay ahead of incidents with proactive anomaly detection and clear runbooks.",
  },
  {
    title: "Backend & platform engineers",
    body: "See exactly how code changes impact deploys, latency, and reliability.",
  },
  {
    title: "Startup teams",
    body: "Ship faster without adding a full-time release engineer to the team.",
  },
];

export default function AudienceSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">WHO IT\'S FOR</p>
        <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Designed for modern engineering teams</h2>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {roles.map((role, idx) => (
          <motion.div
            key={role.title}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300 shadow-lg backdrop-blur transition hover:-translate-y-1 hover:border-[#7C5CFF]/70 hover:shadow-[0_18px_60px_rgba(124,92,255,0.6)]"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
          >
            <h3 className="text-base font-semibold text-white">{role.title}</h3>
            <p className="mt-2">{role.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
