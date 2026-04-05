import { motion } from "framer-motion";
import FounderStorySection from "../sections/FounderStorySection";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function About() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#020617] via-[#020617] to-[#020617] text-slate-100">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto space-y-4 text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300/80">About DCPVAS</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white">
            Built by a developer who was tired of debugging logs
          </h1>
          <p className="text-sm sm:text-base text-slate-400">
            DCPVAS was created to turn real CI/CD frustration into a product that uses AI to explain failures,
            surface root causes, and suggest fixes — without making you dig through endless log output.
          </p>
        </motion.div>
      </section>

      {/* Founder story (reuse section component) */}
      <FounderStorySection />

      {/* Why DCPVAS was built & journey */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2 items-start">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="space-y-4 text-sm sm:text-base text-slate-400"
          >
            <h2 className="text-2xl font-semibold text-white">Why DCPVAS was built</h2>
            <p>
              Continuous integration made shipping faster, but it also created a new kind of pain: red pipelines with
              logs that only made sense after twenty minutes of guesswork. Every team I worked with eventually had the
              same ritual — someone screenshares a failing job, everyone squints at the log, and we hope someone
              remembers seeing this error before.
            </p>
            <p>
              The idea behind DCPVAS was simple: if humans can read these logs and connect them to a root cause, AI can
              too. Instead of building yet another dashboard, the goal was to build an assistant that sits next to your
              pipeline, watches every run, and gives you a clear story whenever something breaks.
            </p>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="space-y-4 text-sm sm:text-base text-slate-400"
          >
            <h2 className="text-2xl font-semibold text-white">How it was built</h2>
            <p>
              DCPVAS started as a side project stitched together from Jenkins webhooks, Node services, and a lot of
              experimental prompts. Early versions were rough: models hallucinated fixes, log parsers broke on edge
              cases, and some builds produced more noise than signal.
            </p>
            <p>
              Over time, the system was hardened with real pipelines, noisy logs, and production-style failures. The
              focus stayed on one thing: if the suggestion doesn&apos;t actually help a developer fix the failure faster, it
              doesn&apos;t ship. That lens shaped everything from the data model to the UI.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="grid gap-6 md:grid-cols-2"
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.9)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">Mission</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Make CI/CD debugging effortless</h3>
            <p className="mt-3 text-sm sm:text-base text-slate-300">
              The mission of DCPVAS is to remove the dread from broken pipelines. When something fails, you should see
              a plain-language explanation, a probable root cause, and a safe next step — not a wall of stack traces.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.9)] backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300/80">Vision</p>
            <h3 className="mt-2 text-xl font-semibold text-white">An AI teammate for DevOps</h3>
            <p className="mt-3 text-sm sm:text-base text-slate-300">
              The long-term vision is for DCPVAS to become the go-to AI assistant for DevOps engineers — one place that
              understands your pipelines, your services, and your incidents, and helps you move from &ldquo;what broke?&rdquo; to
              &ldquo;it&apos;s already fixed&rdquo;.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Future roadmap */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 shadow-[0_18px_45px_rgba(15,23,42,0.9)] backdrop-blur"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">What&apos;s next</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Where DCPVAS is going</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm text-slate-300">
            <div>
              <p className="font-medium text-slate-100">Real-time pipeline monitoring</p>
              <p className="mt-1 text-slate-400">
                Surface anomalies and regressions while a run is still in progress, not just after it fails.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-100">Smarter AI analysis</p>
              <p className="mt-1 text-slate-400">
                Use richer context from past incidents, code changes, and infra to suggest safer, more precise fixes.
              </p>
            </div>
            <div>
              <p className="font-medium text-slate-100">Collaboration built in</p>
              <p className="mt-1 text-slate-400">
                Share incident timelines, AI summaries, and remediation steps with your team without leaving your tools.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45 }}
          className="rounded-2xl border border-[#7C5CFF]/40 bg-gradient-to-r from-[#7C5CFF]/20 via-indigo-500/20 to-cyan-500/10 p-6 sm:p-8 text-center shadow-[0_22px_70px_rgba(15,23,42,0.95)]"
        >
          <h2 className="text-2xl sm:text-3xl font-semibold text-white">Join the future of debugging</h2>
          <p className="mt-3 text-sm sm:text-base text-slate-200">
            If you&apos;re tired of reading the same failures twice, DCPVAS is built for you. Plug it into your pipeline
            and let AI handle the log-reading.
          </p>
          <button className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-slate-900 shadow-[0_18px_45px_rgba(15,23,42,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(15,23,42,0.95)]">
            Explore Dashboard
          </button>
        </motion.div>
      </section>
    </main>
  );
}
