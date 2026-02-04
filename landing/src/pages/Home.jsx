import HeroBackground3D from "../components/HeroBackground3D";

export default function Home() {
  return (
    <section className="relative max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16">

      {/* 3D background (behind content) */}
      <HeroBackground3D />

      {/* Left */}
      <div className="relative z-10">
        <h1 className="text-5xl font-bold leading-tight">
          Debug CI/CD pipelines
          <span className="block text-primary mt-2">
            10× faster with AI
          </span>
        </h1>

        <p className="text-muted mt-6 max-w-lg">
          DCPVAS analyzes Jenkins pipeline logs, detects failures,
          and generates human-readable root cause analysis with
          actionable fixes — instantly.
        </p>

        <div className="flex gap-4 mt-8">
          <button className="
            bg-primary text-text px-6 py-3 rounded-lg
            hover:shadow-[0_0_25px_#7C5CFF]
            transition
          ">
            Start Free Trial
          </button>

          <button className="
            border border-border text-text px-6 py-3 rounded-lg
            hover:border-primary transition
          ">
            Watch Demo
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-10 mt-12 text-sm">
          <div>
            <p className="text-primary font-bold text-xl">85%</p>
            <p className="text-muted">Faster debugging</p>
          </div>
          <div>
            <p className="text-primary font-bold text-xl">10K+</p>
            <p className="text-muted">Pipelines analyzed</p>
          </div>
          <div>
            <p className="text-primary font-bold text-xl">99.9%</p>
            <p className="text-muted">Uptime SLA</p>
          </div>
        </div>
      </div>

      {/* Right (Mock Dashboard box) */}
      <div className="
        bg-surface border border-border rounded-xl
        p-6 shadow-xl relative z-10
      ">
        <p className="text-muted text-sm mb-4">PipelineAI Dashboard</p>

        <div className="space-y-3 text-sm font-mono">
          <p className="text-green-400">✔ Build passed</p>
          <p className="text-red-400">✖ Unit Test failed</p>
          <p className="text-yellow-400">⚠ Warning detected</p>
          <p className="text-accent">AI analyzing error patterns...</p>
        </div>
      </div>

    </section>
  );
}
