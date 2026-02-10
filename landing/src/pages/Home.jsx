import HeroBackground3D from "../components/HeroBackground3D";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Simple teal line icons to match screenshot style
function FeatureIcon({ name }) {
  switch (name) {
    case "analysis":
      // Chip / AI icon
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent">
          <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4 12h2M18 12h2M12 4v2M12 18v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "bolt":
      // Target / crosshair icon
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent">
          <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 6v3M12 15v3M6 12h3M15 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "alert":
      // Shield/alert icon
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent">
          <path d="M12 4l6 2v5c0 4-3.2 6.7-6 8-2.8-1.3-6-4-6-8V6l6-2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 8v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="15.5" r="1" fill="currentColor" />
        </svg>
      );
    case "chart":
      // Bar chart icon
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent">
          <path d="M5 19h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <rect x="6" y="12" width="2.8" height="6" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
          <rect x="11" y="9" width="2.8" height="9" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
          <rect x="16" y="6" width="2.8" height="12" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Home() {
  // Stepper animation: cycles 1 → 2 → 3 → 4
  const [activeStep, setActiveStep] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  useEffect(() => {
    const intervalMs = prefersReducedMotion ? 2400 : 1800;
    const t = setInterval(() => setActiveStep((s) => (s + 1) % 4), intervalMs);
    return () => clearInterval(t);
  }, [prefersReducedMotion]);
  return (
    <>
      <section className="relative max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-[1.05fr_0.95fr] gap-16">
        {/* Background visuals */}
        <HeroBackground3D />

        {/* Soft radial glow overlays behind text and screen */}
        <div className="absolute inset-0 pointer-events-none z-[1]">
          {/* Left cyan halo behind headline */}
          <div className="absolute left-[-12%] top-[6%] w-[780px] h-[780px] rounded-full blur-[90px] opacity-70 bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.26)_0%,_rgba(0,229,255,0)_60%)]" />
          {/* Right card glow mix (cyan + purple) */}
          <div className="absolute right-[-6%] top-[10%] w-[680px] h-[680px] rounded-full blur-[80px] opacity-55 bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.18)_0%,_rgba(0,229,255,0)_58%)]" />
          <div className="absolute right-[-2%] top-[22%] w-[520px] h-[520px] rounded-full blur-[80px] opacity-40 bg-[radial-gradient(ellipse_at_center,_rgba(124,92,255,0.28)_0%,_rgba(124,92,255,0)_60%)]" />
        </div>

        {/* Left: Headline + CTA */}
        <motion.div
          className="relative z-10 will-change-transform"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          viewport={{ once: true, margin: "-120px" }}
        >
          <div className="inline-flex items-center gap-2 text-xs text-muted px-3 py-1 rounded-full border border-border/70 bg-surface/60">
            <span className="inline-block w-2 h-2 rounded-full bg-accent" />
            Now with GPT-4 Integration
          </div>

          <h1 className="mt-6 text-5xl md:text-6xl font-bold leading-tight">
            Debug pipelines
            <span className="block bg-gradient-to-r from-accent to-primary text-transparent bg-clip-text mt-2">
              10x faster with AI
            </span>
          </h1>

          <p className="text-muted mt-6 max-w-xl">
            Stop wasting hours debugging CI/CD failures. PipelineAI analyzes
            your logs, identifies root causes, and provides actionable fixes in
            seconds.
          </p>

          <div className="flex flex-wrap gap-4 mt-8">
            <button className="px-6 py-3 rounded-lg font-medium text-text bg-gradient-to-r from-accent to-primary shadow-[0_0_30px_rgba(124,92,255,0.35)] hover:shadow-[0_0_45px_rgba(124,92,255,0.55)] transition">
              Start Free Trial <span className="ml-2">→</span>
            </button>
            <button className="px-6 py-3 rounded-lg font-medium text-text border border-border hover:border-primary/80 transition">
              ▷ Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-10 mt-12 text-sm">
            <div>
              <p className="font-bold text-2xl text-text">85%</p>
              <p className="text-muted">Faster debugging</p>
            </div>
            <div>
              <p className="font-bold text-2xl text-text">10K+</p>
              <p className="text-muted">Pipelines analyzed</p>
            </div>
            <div>
              <p className="font-bold text-2xl text-text">99.9%</p>
              <p className="text-muted">Uptime SLA</p>
            </div>
          </div>
        </motion.div>

        {/* Right: Dashboard mock */}
        <motion.div
          className="relative z-10 will-change-transform"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          viewport={{ once: true, margin: "-120px" }}
        >
          {/* Tight glow directly behind the card */}
          <div className="absolute -inset-6 rounded-[28px] blur-[85px] opacity-55 bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.22)_0%,_rgba(0,229,255,0)_60%)]" />
          <div className="absolute -inset-10 rounded-[34px] blur-[100px] opacity-40 bg-[radial-gradient(ellipse_at_center,_rgba(124,92,255,0.24)_0%,_rgba(124,92,255,0)_62%)]" />
          <div className="bg-surface/90 border border-border rounded-2xl shadow-2xl p-5 relative z-10">
            {/* Window dots */}
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
              <span className="ml-auto text-muted text-xs">
                PipelineAI Dashboard
              </span>
            </div>

            {/* Status pills */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#0F1422] border border-border p-4">
                <p className="text-muted text-xs">Passed</p>
                <p className="text-text text-2xl font-semibold mt-1">127</p>
              </div>
              <div className="rounded-xl bg-[#0F1422] border border-border p-4">
                <p className="text-muted text-xs">Failed</p>
                <p className="text-text text-2xl font-semibold mt-1">3</p>
              </div>
              <div className="rounded-xl bg-[#0F1422] border border-border p-4">
                <p className="text-muted text-xs">Warning</p>
                <p className="text-text text-2xl font-semibold mt-1">12</p>
              </div>
            </div>

            {/* Pipeline row */}
            <div className="mt-5 rounded-xl bg-[#0F1422] border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-text font-medium">main</span>
                  <span className="text-muted ml-2">build #1847</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1 rounded-full bg-[#13302b] text-[#58d19d] border border-[#1c463b]">
                    Build
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#152238] text-[#5cc5ff] border border-[#243553]">
                    Test
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#3a1720] text-[#ff6b8b] border border-[#5b2432]">
                    Deploy
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#192033] text-[#aab3c2] border border-[#2a3347]">
                    Verify
                  </span>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="mt-5 rounded-xl bg-[#0F1422] border border-border p-4">
              <p className="font-medium">AI Analysis</p>
              <p className="text-muted text-sm mt-1">
                Detected: Memory allocation error in deploy stage
              </p>
              <div className="flex items-center gap-3 mt-3 text-xs">
                <span className="px-3 py-1 rounded-full bg-[#132334] text-[#52b7ff] border border-[#21364c]">
                  Auto-fix available
                </span>
                <span className="text-muted">98% confidence</span>
              </div>
            </div>

            {/* Logs */}
            <div className="mt-5 rounded-xl bg-[#0F1422] border border-border p-4">
              <p className="text-muted text-sm mb-2">Live Logs</p>
              <div className="font-mono text-xs space-y-1">
                <p className="text-[#58d19d]">[INFO] Starting deployment...</p>
                <p className="text-[#5cc5ff]">
                  [INFO] Building container image
                </p>
                <p className="text-[#ff6b8b]">
                  [ERROR] Out of memory: Kill process
                </p>
                <p className="text-[#52b7ff]">
                  [AI] Analyzing error pattern...
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* How it works section */}
      <section className="relative max-w-7xl mx-auto px-6 pb-28 text-center">
        <p className="text-xs tracking-widest text-muted">HOW IT WORKS</p>
        <h2 className="mt-3 text-3xl md:text-4xl font-bold text-text">From failure to fix in seconds</h2>
        <p className="mt-3 text-muted max-w-3xl mx-auto">A streamlined workflow that integrates seamlessly with your existing tools.</p>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Item 1: Pipeline Runs */}
          <motion.div
            className="group relative rounded-2xl border border-border bg-[#0F1422] p-6 will-change-transform"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            viewport={{ once: true, margin: "-120px" }}
          >
            <div className="relative w-14 h-14 mx-auto rounded-xl bg-[#0E1424] border border-[#1E2A3B] flex items-center justify-center mb-4 overflow-hidden">
              <span className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.25)_0%,_rgba(0,229,255,0)_70%)] opacity-30" />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent">
                <path d="M8 12a3 3 0 0 1 3-3h2a3 3 0 1 1 0 6h-2a3 3 0 0 1-3-3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M10 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-text font-semibold">Pipeline Runs</p>
            <p className="text-muted mt-2 text-sm">Your CI/CD pipeline executes as normal</p>
          </motion.div>

          {/* Item 2: Logs Collected */}
          <motion.div
            className="group relative rounded-2xl border border-border bg-[#0F1422] p-6 will-change-transform"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            viewport={{ once: true, margin: "-120px" }}
          >
            <div className="relative w-14 h-14 mx-auto rounded-xl bg-[#0E1424] border border-[#1E2A3B] flex items-center justify-center mb-4 overflow-hidden">
              <span className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.25)_0%,_rgba(0,229,255,0)_70%)] opacity-30" />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent">
                <rect x="5" y="6" width="14" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
                <rect x="5" y="11" width="14" height="3.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
                <rect x="5" y="16" width="14" height="2.5" rx="1" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </div>
            <p className="text-text font-semibold">Logs Collected</p>
            <p className="text-muted mt-2 text-sm">We ingest logs in real-time</p>
          </motion.div>

          {/* Item 3: Error Detection */}
          <motion.div
            className="group relative rounded-2xl border border-border bg-[#0F1422] p-6 will-change-transform"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            viewport={{ once: true, margin: "-120px" }}
          >
            <div className="relative w-14 h-14 mx-auto rounded-xl bg-[#0E1424] border border-[#1E2A3B] flex items-center justify-center mb-4 overflow-hidden">
              <span className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.25)_0%,_rgba(0,229,255,0)_70%)] opacity-30" />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent">
                <circle cx="11" cy="11" r="4.8" stroke="currentColor" strokeWidth="1.6" />
                <path d="M15.5 15.5L19 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-text font-semibold">Error Detection</p>
            <p className="text-muted mt-2 text-sm">Anomalies are instantly flagged</p>
          </motion.div>

          {/* Item 4: AI Analysis */}
          <motion.div
            className="group relative rounded-2xl border border-border bg-[#0F1422] p-6 will-change-transform"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            viewport={{ once: true, margin: "-120px" }}
          >
            <div className="relative w-14 h-14 mx-auto rounded-xl bg-[#0E1424] border border-[#1E2A3B] flex items-center justify-center mb-4 overflow-hidden">
              <span className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,_rgba(124,92,255,0.25)_0%,_rgba(124,92,255,0)_70%)] opacity-30" />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
                <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
                <path d="M4 12h2M18 12h2M12 4v2M12 18v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </div>
            <p className="text-text font-semibold">AI Analysis</p>
            <p className="text-muted mt-2 text-sm">Deep learning models analyze patterns</p>
          </motion.div>

          {/* Item 5: Clear Results */}
          <motion.div
            className="group relative rounded-2xl border border-border bg-[#0F1422] p-6 will-change-transform"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            viewport={{ once: true, margin: "-120px" }}
          >
            <div className="relative w-14 h-14 mx-auto rounded-xl bg-[#0E1424] border border-[#1E2A3B] flex items-center justify-center mb-4 overflow-hidden">
              <span className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,_rgba(124,92,255,0.25)_0%,_rgba(124,92,255,0)_70%)] opacity-30" />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
                <path d="M7 5h7l3 3v11H7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M9 10h6M9 13h6M9 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-text font-semibold">Clear Results</p>
            <p className="text-muted mt-2 text-sm">Get actionable fixes in plain English</p>
          </motion.div>
        </div>
      </section>

      {/* Problem section */}
      <section className="relative max-w-7xl mx-auto px-6 pt-6 pb-24 justify-center text-center">
        <p className="text-xs tracking-widest text-muted">THE PROBLEM</p>
        <h2 className="mt-3 text-3xl md:text-4xl font-bold text-text">
          DevOps teams are drowning in complexity
        </h2>
        <p className="mt-3 text-muted max-w-3xl mx-auto">
          Modern CI/CD pipelines generate massive amounts of data. Without the
          right tools, debugging becomes a nightmare.
        </p>

        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <motion.div
            className="group relative rounded-2xl border border-border bg-[#0F1422] p-6 transition hover:border-primary/60 hover:shadow-[0_0_40px_rgba(124,92,255,0.18)] will-change-transform"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="relative w-12 h-12 rounded-xl bg-[#0E1424] border border-[#1E2A3B] flex items-center justify-center mb-4 overflow-hidden">
              <span className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,_rgba(124,92,255,0.25)_0%,_rgba(124,92,255,0)_70%)] opacity-30" />
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
              >
                <path
                  d="M6 12c2.5-2.5 6.5-2.5 9 0"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                <path
                  d="M12 6l1.2 2.7L16 10l-2.8 1.3L12 14l-1.2-2.7L8 10l2.8-1.3L12 6z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-text font-semibold">Manual Log Debugging</h3>
            <p className="text-muted mt-2">
              Engineers spend 30% of their time searching through thousands of
              log lines to find the root cause.
            </p>
            <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition">
              <div className="absolute -inset-2 rounded-3xl blur-[60px] opacity-30 bg-[radial-gradient(ellipse_at_center,_rgba(124,92,255,0.25)_0%,_rgba(124,92,255,0)_60%)]" />
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            className="group relative rounded-2xl border border-border bg-[#0F1422] p-6 transition hover:border-accent/60 hover:shadow-[0_0_40px_rgba(0,229,255,0.18)] will-change-transform"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="relative w-12 h-12 rounded-xl bg-[#0E1424] border border-[#1E2A3B] flex items-center justify-center mb-4 overflow-hidden">
              <span className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.25)_0%,_rgba(0,229,255,0)_70%)] opacity-30" />
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-accent"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M12 8v4.5l3 2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-text font-semibold">Pipeline Failures</h3>
            <p className="text-muted mt-2">
              CI/CD failures block deployments for hours while teams scramble to
              identify and fix issues.
            </p>
            <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition">
              <div className="absolute -inset-2 rounded-3xl blur-[60px] opacity-30 bg-[radial-gradient(ellipse_at_center,_rgba(124,92,255,0.18)_0%,_rgba(124,92,255,0)_60%)]" />
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            className="group relative rounded-2xl border border-border bg-[#0F1422] p-6 transition hover:border-accent/60 hover:shadow-[0_0_40px_rgba(0,229,255,0.18)] will-change-transform"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="relative w-12 h-12 rounded-xl bg-[#0E1424] border border-[#1E2A3B] flex items-center justify-center mb-4 overflow-hidden">
              <span className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.25)_0%,_rgba(0,229,255,0)_70%)] opacity-30" />
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-accent"
              >
                <rect
                  x="5"
                  y="5"
                  width="14"
                  height="14"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M8 13h8M8 10h5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h3 className="text-text font-semibold">Delayed Insights</h3>
            <p className="text-muted mt-2">
              By the time issues are detected, the damage is done. Reactive
              debugging costs time and money.
            </p>
            <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition">
              <div className="absolute -inset-2 rounded-3xl blur-[70px] opacity-30 bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.26)_0%,_rgba(0,229,255,0)_60%)]" />
            </div>
          </motion.div>

          {/* Card 4 */}
          <motion.div
            className="group relative rounded-2xl border border-border bg-[#0F1422] p-6 transition hover:border-primary/60 hover:shadow-[0_0_40px_rgba(124,92,255,0.18)] will-change-transform"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <div className="relative w-12 h-12 rounded-xl bg-[#0E1424] border border-[#1E2A3B] flex items-center justify-center mb-4 overflow-hidden">
              <span className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,_rgba(124,92,255,0.25)_0%,_rgba(124,92,255,0)_70%)] opacity-30" />
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
              >
                <path
                  d="M7 9l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17 15l-4-4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="text-text font-semibold">Context Switching</h3>
            <p className="text-muted mt-2">
              Jumping between tools, logs, and dashboards fragments focus and
              slows down incident response.
            </p>
            <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition">
              <div className="absolute -inset-2 rounded-3xl blur-[60px] opacity-25 bg-[radial-gradient(ellipse_at_center,_rgba(124,92,255,0.22)_0%,_rgba(124,92,255,0)_60%)]" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Solution section */}
      <section className="relative max-w-7xl mx-auto px-6 pb-24">
        {/* Section glow background */}
        <div className="absolute right-[-8%] top-[6%] w-[900px] h-[900px] rounded-full blur-[120px] opacity-40 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.18)_0%,_rgba(0,229,255,0)_60%)]" />
        <div className="absolute right-[-4%] top-[14%] w-[700px] h-[700px] rounded-full blur-[120px] opacity-30 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,_rgba(124,92,255,0.20)_0%,_rgba(124,92,255,0)_60%)]" />

        <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-start">
          {/* Left copy & features */}
          <div>
            <p className="text-xs tracking-widest text-muted">THE SOLUTION</p>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-text">
              Intelligence that understands your pipelines
            </h2>
            <p className="mt-3 text-muted max-w-2xl">
              PipelineAI brings the power of large language models to your
              DevOps workflow, transforming how you debug and optimize CI/CD.
            </p>

            <div className="mt-8 space-y-6">
              {[
                {
                  title: "AI-Powered Analysis",
                  desc: "Our ML models understand CI/CD patterns and instantly identify anomalies in your pipeline logs.",
                  icon: "analysis",
                },
                {
                  title: "Instant Root Cause",
                  desc: "Get actionable insights in seconds, not hours. Understand exactly what went wrong and why.",
                  icon: "bolt",
                },
                {
                  title: "Preventive Alerts",
                  desc: "Predict failures before they happen with intelligent pattern recognition and early warnings.",
                  icon: "alert",
                },
                {
                  title: "Pipeline Analytics",
                  desc: "Track performance trends, identify bottlenecks, and optimize your deployment workflows.",
                  icon: "chart",
                },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  className="flex gap-4 items-start will-change-transform"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 240, damping: 28 }}
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <div className="relative w-12 h-12 rounded-xl bg-[#0f2a35] border border-[#19485b] flex items-center justify-center overflow-hidden">
                    <span className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.25)_0%,_rgba(0,229,255,0)_70%)] opacity-30" />
                    <FeatureIcon name={f.icon} />
                  </div>
                  <div>
                    <p className="text-text font-semibold">{f.title}</p>
                    <p className="text-muted mt-1 max-w-xl">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: stepper card */}
          <div className="relative pt-10">
            <div className="absolute -inset-6 rounded-[32px] blur-[110px] opacity-50 bg-[radial-gradient(ellipse_at_center,_rgba(0,229,255,0.22)_0%,_rgba(0,229,255,0)_60%)]" />
            <div className="absolute -inset-10 rounded-[38px] blur-[120px] opacity-35 bg-[radial-gradient(ellipse_at_center,_rgba(124,92,255,0.22)_0%,_rgba(124,92,255,0)_62%)]" />
            <div className="relative bg-[#0F1422]/95 border border-border rounded-2xl shadow-2xl p-6 w-full max-w-[560px] ml-auto">
              {[
                {
                  label: "CI/CD Pipeline",
                  desc: "Your existing Jenkins, GitHub Actions, or GitLab CI",
                },
                {
                  label: "Log Collection",
                  desc: "Automatic ingestion of build logs and metrics",
                },
                {
                  label: "AI Analysis",
                  desc: "Real-time processing with our ML pipeline",
                },
                {
                  label: "Structured Insights",
                  desc: "Clear, actionable results delivered instantly",
                },
              ].map((step, idx) => (
                <motion.div
                  key={idx}
                  className="group will-change-transform"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 240, damping: 28 }}
                  viewport={{ once: true, margin: "-120px" }}
                >
                  <div className={`flex items-start gap-4 rounded-xl border bg-[#0F1422] p-5 transition hover:translate-y-[-2px] ${activeStep === idx ? "border-accent/60 shadow-[0_0_30px_rgba(0,229,255,0.18)]" : "border-[#1e2738]"}`}>
                    <motion.div
                      className="relative w-10 h-10 rounded-full bg-[#0f2a35] border border-[#1b4354] text-accent flex items-center justify-center font-semibold shrink-0"
                      animate={activeStep === idx && !prefersReducedMotion ? { y: [0, -6, 0] } : { y: 0 }}
                      transition={{ duration: 1.2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
                    >
                      {idx + 1}
                    </motion.div>
                    <div>
                      <p className="text-text font-medium">{step.label}</p>
                      <p className="text-muted text-sm mt-1">{step.desc}</p>
                    </div>
                  </div>
                  {/* connector line except last */}
                  {idx < 3 && (
                    <div className="flex items-center justify-center py-4 relative">
                      <div className="h-px w-2/3 bg-gradient-to-r from-transparent via-[#1e2738] to-transparent" />
                      {/* animated arrow between steps */}
                      <motion.span
                        className="absolute -bottom-1 text-accent"
                        animate={activeStep === idx && !prefersReducedMotion ? { y: [0, -6, 0], opacity: [0.6, 1, 0.6] } : { y: 0, opacity: 0 }}
                        transition={{ duration: 1.2, repeat: prefersReducedMotion ? 0 : Infinity, ease: "easeInOut" }}
                      >
                        ↓
                      </motion.span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
