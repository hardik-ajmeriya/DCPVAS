import { motion } from "framer-motion";
import founderPhoto from "../assets/about-founder.jpeg";

export default function FounderStorySection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="grid gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] items-center">
        {/* Left: founder image / avatar */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="founder-image-column justify-center"
        >
          <div className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-cyan-500/40 via-indigo-500/40 to-violet-500/40 blur-xl" />
            <div className="founder-image-wrapper relative border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
              <img src={founderPhoto} alt="Founder of DCPVAS" />
            </div>
          </div>
        </motion.div>

        {/* Right: story content */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="space-y-4 text-sm text-slate-400 sm:text-base"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/80">About the founder</p>

          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Built from real debugging frustration
          </h2>

          <p>
            For years I lived in CI dashboards, trying to work out why a perfectly good commit suddenly broke the
            pipeline. Most days ended the same way: endless scrolling, copying log snippets into chat, and asking
            "does anyone know why this stage keeps failing?".
          </p>

          <p>
            The logs were always there, but they weren&apos;t talking. Every failure felt like starting from scratch, even
            when we&apos;d seen a similar issue last week. I kept thinking: if I can read this, why can&apos;t an AI read it,
            understand it, and just tell me what went wrong?
          </p>

          <p>
            That&apos;s how DCPVAS was born — a system that turns noisy CI/CD failures into clear summaries, concrete root
            causes, and practical fixes instead of guesswork. It doesn&apos;t replace engineers; it gives them back the
            hours they used to spend chasing red builds.
          </p>

          <p>
            The vision is simple: debugging should be the smallest part of shipping software, not the part that eats
            your evening. DCPVAS exists so DevOps teams can move fast without dreading the next broken pipeline.
          </p>

          <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span>Built for real-world CI/CD stacks — Jenkins, GitHub Actions, GitLab CI and more.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <span>Obsessed with speed and clarity over dashboards full of noise.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <span>Designed by an engineer who has fixed too many 2 a.m. builds.</span>
            </div>
          </div>

          <div className="mt-6 border-l border-cyan-500/40 pl-4 text-sm text-slate-200">
            <p className="italic text-slate-100">
              "Debugging shouldn&apos;t take hours. If logs can explain the failure, AI should be the one reading them."
            </p>
            <div className="mt-3 text-xs text-slate-400">
              <p className="font-medium text-slate-100">Founder of DCPVAS</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
