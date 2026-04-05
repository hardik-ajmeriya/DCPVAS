import { motion } from "framer-motion";

const steps = [
  {
    id: 1,
    title: "CI/CD Pipeline",
    description: "Connect Jenkins, GitHub Actions, or GitLab CI.",
    iconHint: "Integrations",
  },
  {
    id: 2,
    title: "Log Collection",
    description: "Automatically ingest build logs, metrics, and events.",
    iconHint: "Logs",
  },
  {
    id: 3,
    title: "AI Analysis",
    description: "Real-time failure detection and root cause analysis.",
    iconHint: "AI",
    active: true,
  },
  {
    id: 4,
    title: "Structured Insights",
    description: "Human summary, suggested fixes, and technical recommendations.",
    iconHint: "Insights",
  },
];

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.12, duration: 0.45 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function HowItWorksSection() {
  return (
		<section id="how-it-works" className="mx-auto max-w-6xl px-6 pt-10 pb-16">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1.3fr)] items-start">
        {/* Left: heading + copy */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45 }}
          className="space-y-3"
        >
          <p className="text-sm font-medium tracking-wide text-cyan-300/80">HOW IT WORKS</p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            How DCPVAS Works
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            From pipeline failure to intelligent resolution in seconds.
          </p>
          <p className="text-slate-400 text-sm sm:text-base">
            Connect your CI/CD pipeline and let AI handle debugging, analysis, and fixes so your team can stay
            focused on shipping.
          </p>

          <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse" />
              <span>DCPVAS plugs into existing pipelines without changing your tooling.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500" />
              <span>Every failure is analyzed in context of recent runs, tests, and infra.</span>
            </div>
          </div>
        </motion.div>

        {/* Right: step flow */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="relative md:-ml-4 lg:-ml-6"
        >
          {/* Vertical connector line */}
          <div className="pointer-events-none absolute left-5 top-3 bottom-3 hidden w-px bg-gradient-to-b from-cyan-400/70 via-blue-500/50 to-purple-500/50 md:block" />

          {/* Animated dots along the line */}
          <div className="pointer-events-none absolute left-4 top-10 hidden h-2 w-2 -translate-x-[1px] rounded-full bg-cyan-400/80 blur-[1px] md:block animate-ping" />

          <div className="space-y-4">
            {steps.map((step, index) => {
              const isActive = step.active;

              return (
                <motion.div
                  key={step.id}
                  variants={itemVariants}
                  className="relative flex gap-4"
                >
                  {/* Step number */}
                  <div className="relative mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center">
                    <div
                      className={[
                        "flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold",
                        isActive
                          ? "border-cyan-400/80 bg-cyan-500/10 text-cyan-200 shadow-[0_0_25px_rgba(34,211,238,0.55)]"
                          : "border-slate-600/70 bg-slate-900/80 text-slate-300",
                      ].join(" ")}
                    >
                      {step.id}
                    </div>
                    {isActive && (
                      <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-cyan-500/30 blur-xl" />
                    )}
                  </div>

                  {/* Card */}
                  <motion.div
                    whileHover={{ scale: 1.03, translateX: 4 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className={[
                      "group relative flex-1 rounded-xl border p-4 text-xs sm:text-sm transition-all",
                      "bg-white/[0.03] backdrop-blur",
                      isActive
                        ? "border-cyan-400/80 shadow-[0_0_40px_rgba(34,211,238,0.45)] ring-1 ring-cyan-400/50"
                        : "border-white/10 hover:border-white/25 hover:bg-white/[0.05] hover:shadow-[0_14px_45px_rgba(15,23,42,0.8)]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p
                          className={[
                            "text-[11px] font-semibold uppercase tracking-[0.16em]",
                            isActive ? "text-cyan-300" : "text-slate-400",
                          ].join(" ")}
                        >
                          Step {step.id}
                        </p>
                        <h3 className="mt-1 text-sm font-medium text-white">{step.title}</h3>
                      </div>
                      <div
                        className={[
                          "hidden rounded-full px-2 py-1 text-[10px] font-medium sm:inline-flex",
                          isActive
                            ? "bg-gradient-to-r from-cyan-400/20 via-sky-500/20 to-violet-500/20 text-cyan-200 border border-cyan-400/40"
                            : "border border-white/10 bg-slate-900/60 text-slate-300",
                        ].join(" ")}
                      >
                        {step.iconHint}
                      </div>
                    </div>

                    <p className="mt-2 text-slate-300/90">{step.description}</p>

                    {/* subtle arrow / connector hint */}
                    <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      <span className="h-px flex-1 bg-gradient-to-r from-slate-600/60 via-slate-500/40 to-transparent" />
                      <span>{index < steps.length - 1 ? "Flows into next" : "Feeds back into pipeline"}</span>
                    </div>

                    {isActive && (
                      <div className="pointer-events-none absolute -inset-px rounded-xl border border-cyan-400/40 opacity-70 blur-[1px]" />
                    )}
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
