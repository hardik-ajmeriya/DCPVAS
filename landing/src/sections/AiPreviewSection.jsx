import { motion } from "framer-motion";

export default function AiPreviewSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <motion.div
        className="max-w-2xl space-y-2 mb-8"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45 }}
      >
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">AI that writes the postmortem for you</h2>
        <p className="text-sm text-slate-400">
          DCPVAS doesn't just summarize logs. It produces clear explanations and concrete fixes your team can
          apply immediately.
        </p>
      </motion.div>

      {/* Error log box full-width */}
      <motion.div
        className="mb-6 max-w-full overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-slate-200 shadow-[0_22px_70px_rgba(15,23,42,0.95)] backdrop-blur"
        initial={{ opacity: 0, x: -24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.45 }}
      >
        <div className="mb-3 flex items-center justify-between text-[11px] text-slate-400">
          <span className="break-all">logs/mrc-foods-prod-#24d1ac7</span>
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
            Streaming from Jenkins
          </span>
        </div>
        <div className="space-y-1 break-words">
          <p className="text-slate-400">[INFO] Stage 'Build Docker Image'</p>
          <p className="text-slate-400">[INFO] Running on agent jenkins in /var/lib/jenkins/workspace/mrc-foods-prod</p>
          <p className="text-slate-400">[INFO] + git rev-parse --short HEAD</p>
          <p className="text-slate-400">[INFO] + dockerrr build -t mrc-foods:24d1ac7 .</p>
          <p className="text-rose-400">[ERROR] /var/lib/jenkins/.../script.sh: 2: dockerrr: not found</p>
          <p className="text-rose-400">[ERROR] script returned exit code 127</p>
          <p className="text-sky-300">[AI] Shell attempted to run 'dockerrr', which is not installed.</p>
          <p className="text-sky-300">[AI] Downstream stages Deploy Staging/Production were skipped.</p>
        </div>
      </motion.div>

      {/* Three explanation cards under the log, no blank space */}
      <div className="grid gap-4 md:grid-cols-3 items-stretch">
        <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-200 shadow-lg transition hover:-translate-y-1 hover:border-[#7C5CFF]/70 hover:shadow-[0_18px_60px_rgba(124,92,255,0.6)]">
            <p className="text-[11px] font-semibold text-slate-300">Human summary</p>
            <p className="mt-2">
              The <span className="font-mono text-[#38bdf8]">mrc-foods-prod</span> pipeline fails in the
              <span className="font-mono"> Build Docker Image</span> stage. The shell tries to run the command
              <span className="font-mono"> dockerrr build -t mrc-foods:24d1ac7 .</span>, but
              <span className="font-mono"> dockerrr</span> does not exist, so the step exits with code 127 and all
              deploy stages are skipped.
            </p>
          </div>
        <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-200 shadow-lg transition hover:-translate-y-1 hover:border-emerald-400/70 hover:shadow-[0_18px_60px_rgba(16,185,129,0.55)]">
            <p className="text-[11px] font-semibold text-emerald-300">Suggested fix</p>
            <p className="mt-2">
              Fix the typo in the Jenkinsfile or pipeline script so the command is
              <span className="font-mono"> docker build -t mrc-foods:$GIT_COMMIT_SHORT .</span> instead of
              <span className="font-mono"> dockerrr build ...</span>. Then re-run the pipeline and, if it still fails
              with <span className="font-mono"> docker: not found</span>, install or expose the Docker CLI on the
              Jenkins agent.
            </p>
          </div>
        <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-200 shadow-lg transition hover:-translate-y-1 hover:border-sky-400/70 hover:shadow-[0_18px_60px_rgba(56,189,248,0.55)]">
          <p className="text-[11px] font-semibold text-sky-300">Technical snippet</p>
          <pre className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-slate-100">
{`// Jenkinsfile (declarative)
stage('Build Docker Image') {
  steps {
    script {
      def short = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
      sh "docker build -t mrc-foods:\${short} ."
    }
  }
}

// Optional: preflight check
stage('Validate tools') {
  steps {
    sh 'docker --version'
  }
}`}
          </pre>
        </div>
      </div>
    </section>
  );
}
