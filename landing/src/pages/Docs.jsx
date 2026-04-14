import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  GitBranch,
  Hash,
  Info,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Rocket,
  Server,
  XCircle,
} from "lucide-react";
import CodeBlock from "../components/docs/CodeBlock";
import AppLayout from "../layouts/AppLayout";

const NAV_GROUPS = [
  {
    label: "Onboarding",
    items: [
      { id: "introduction", title: "Introduction", icon: BookOpen },
      { id: "getting-started", title: "Getting Started", icon: Rocket },
      { id: "connecting-jenkins", title: "Connecting Jenkins", icon: Server },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "how-dcpvas-works", title: "How DCPVAS Works", icon: LayoutDashboard },
      { id: "dashboard-overview", title: "Dashboard Overview", icon: LayoutDashboard },
      { id: "live-pipelines-table", title: "Live Pipelines", icon: GitBranch },
      { id: "pipeline-flow-visualization", title: "Pipeline Flow", icon: GitBranch },
    ],
  },
  {
    label: "AI + Support",
    items: [
      { id: "ai-analysis", title: "AI Analysis", icon: Brain },
      { id: "failure-analysis-panel", title: "Failure Analysis", icon: Brain },
      { id: "troubleshooting", title: "Troubleshooting", icon: AlertTriangle },
    ],
  },
];

const SECTION_IDS = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.id));

function SectionTitle({ id, title }) {
  return (
    <h2 id={id} className="scroll-mt-28 text-2xl sm:text-[2rem] font-semibold text-white tracking-tight">
      <a href={`#${id}`} className="group inline-flex items-center gap-2 hover:text-cyan-300 transition-colors">
        {title}
        <Hash size={16} className="opacity-0 group-hover:opacity-100 text-cyan-300 transition-opacity" />
      </a>
    </h2>
  );
}

export default function Docs() {
  const [activeId, setActiveId] = useState("introduction");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const allSections = useMemo(() => SECTION_IDS, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: "-25% 0px -60% 0px",
        threshold: [0.2, 0.4, 0.7],
      }
    );

    allSections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    const hashId = window.location.hash.replace("#", "");
    if (hashId && allSections.includes(hashId)) {
      const target = document.getElementById(hashId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    return () => observer.disconnect();
  }, [allSections]);

  const scrollToSection = (id) => {
    const section = document.getElementById(id);
    if (!section) return;

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
    setActiveId(id);
    setMobileNavOpen(false);
  };

  const sidebar = (
    <aside
      className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${mobileNavOpen ? "open" : ""}`}
      aria-label="Documentation sidebar"
    >
      <div className="sidebar-top-row">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.png" alt="DCPVAS" className="h-9 w-auto object-contain shrink-0" />
          <div className="sidebar-text min-w-0">
            <p className="text-sm font-semibold text-white truncate">DCPVAS Docs</p>
            <p className="text-xs text-slate-400 truncate">AI CI/CD Analyzer</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900/80 p-1.5 text-slate-300 hover:text-white hover:border-slate-500 transition"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {NAV_GROUPS.map((group, groupIndex) => (
        <div key={group.label} className={`sidebar-group ${groupIndex > 0 ? "sidebar-group-divider" : ""}`}>
          <p className="sidebar-group-title">{group.label}</p>
          <nav className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={`sidebar-item ${activeId === item.id ? "active" : ""}`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="sidebar-text truncate">{item.title}</span>
                </button>
              );
            })}
          </nav>
        </div>
      ))}
    </aside>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#050b16] via-[#030712] to-[#020617] text-slate-100">
      <AppLayout className={sidebarCollapsed ? "sidebar-collapsed" : ""} sidebar={sidebar}>
        <div className="mb-6 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-100"
            aria-expanded={mobileNavOpen}
          >
            <Menu size={16} />
            {mobileNavOpen ? "Hide Sections" : "Browse Sections"}
          </button>
        </div>

        <div className="mb-8 md:mb-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
            <BookOpen size={13} />
            Developer Documentation
          </p>
          <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight text-white">DCPVAS Documentation</h1>
          <p className="mt-4 max-w-3xl text-slate-300 text-base md:text-lg leading-7">
            Production guide for engineering teams using Jenkins with DCPVAS.
            This documentation focuses on real dashboard usage, CI failure analysis flow, and practical troubleshooting.
          </p>
        </div>

        <article className="min-w-0 space-y-12">
            <section className="space-y-4 border-b border-slate-800/70 pb-10">
              <SectionTitle id="introduction" title="Introduction" />
              <p className="text-slate-300 leading-7">
                DCPVAS is an AI-powered CI/CD analyzer that connects directly to Jenkins and helps engineers monitor
                pipeline executions, visualize stage progress, and analyze failures from logs with AI assistance.
              </p>
              <p className="text-slate-300 leading-7">
                Instead of manually searching long console outputs, DCPVAS converts failure data into clear root-cause
                signals, stage-level context, and fix recommendations. The result is faster incident triage and less
                time spent on repetitive debugging.
              </p>
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                <p className="text-sm font-medium text-cyan-200">What DCPVAS gives your team</p>
                <ul className="mt-2 list-disc pl-5 text-slate-300 leading-7">
                  <li>Pipeline execution visibility in near real time.</li>
                  <li>Stage-aware failure detection.</li>
                  <li>AI-driven root cause explanations from logs.</li>
                  <li>Actionable fix suggestions for engineers.</li>
                </ul>
              </div>
            </section>

            <section className="space-y-4 border-b border-slate-800/70 pb-10">
              <SectionTitle id="getting-started" title="Getting Started (Real Flow)" />
              <p className="text-slate-300 leading-7">For teams using the deployed DCPVAS app, onboarding is straightforward:</p>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300 leading-7">
                <li>Open your deployed DCPVAS dashboard URL.</li>
                <li>Navigate to <span className="font-semibold text-white">Settings</span>.</li>
                <li>Configure Jenkins connection details.</li>
                <li>Save settings and run connection test.</li>
                <li>Return to Dashboard and verify pipeline data is visible.</li>
              </ol>
              <p className="text-slate-300 leading-7">
                Most teams can complete initial setup in under 5 minutes when Jenkins URL, job name, and API token are ready.
              </p>
            </section>

            <section className="space-y-4 border-b border-slate-800/70 pb-10">
              <SectionTitle id="connecting-jenkins" title="Connecting Jenkins" />
              <p className="text-slate-300 leading-7">
                Configure these fields in Settings to establish Jenkins connectivity.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-300 leading-7">
                <li><span className="font-semibold text-white">Jenkins URL</span>: Full Jenkins server URL, for example <span className="text-slate-200">http://your-domain:8080</span>.</li>
                <li><span className="font-semibold text-white">Job Name</span>: Exact Jenkins pipeline job name, for example <span className="text-slate-200">mrc-foods-prod</span>.</li>
                <li><span className="font-semibold text-white">Username</span>: Jenkins user account used for API access.</li>
                <li><span className="font-semibold text-white">API Token</span>: Token generated from Jenkins profile settings.</li>
              </ul>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm font-medium text-amber-200">Important</p>
                <p className="mt-2 text-slate-300 leading-7">
                  Use Jenkins API token authentication. Password-based auth is not supported in DCPVAS settings.
                </p>
              </div>

              <p className="text-slate-300 leading-7">Generate your Jenkins API token using this flow:</p>
              <CodeBlock
                language="bash"
                code={`1. Open Jenkins
2. Click your profile (top-right)
3. Open Configure
4. Find API Token section
5. Click Generate Token
6. Copy token and paste into DCPVAS Settings`}
              />

              <p className="text-slate-300 leading-7">Example settings payload:</p>
              <CodeBlock
                language="json"
                code={`{
  "url": "http://your-jenkins-url",
  "jobName": "my-pipeline",
  "username": "admin",
  "apiToken": "your-token"
}`}
              />
            </section>

            <section className="space-y-4 border-b border-slate-800/70 pb-10">
              <SectionTitle id="how-dcpvas-works" title="How DCPVAS Works" />
              <p className="text-slate-300 leading-7">Real backend processing flow after Jenkins is configured:</p>
              <ol className="list-decimal pl-6 space-y-2 text-slate-300 leading-7">
                <li>User submits Jenkins credentials in Settings.</li>
                <li>Backend encrypts and stores credentials securely.</li>
                <li>System fetches run metadata from Jenkins APIs.</li>
                <li>Logs are collected for each build execution.</li>
                <li>Error-focused log filtering removes low-signal noise.</li>
                <li>AI analyzes failure stage, root cause, and fix strategy.</li>
                <li>Dashboard renders insights and status metrics.</li>
              </ol>
            </section>

            <section className="space-y-4 border-b border-slate-800/70 pb-10">
              <SectionTitle id="dashboard-overview" title="Dashboard Overview" />
              <p className="text-slate-300 leading-7">
                The dashboard cards summarize operational health across recent pipeline activity.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-300 leading-7">
                <li><span className="font-semibold text-white">Total Pipelines</span>: Total detected pipeline runs in scope.</li>
                <li><span className="font-semibold text-white">Active Builds</span>: Pipelines currently executing.</li>
                <li><span className="font-semibold text-white">Failed Today</span>: Failures recorded in current day window.</li>
                <li><span className="font-semibold text-white">Avg Fix Time</span>: Estimated average remediation time.</li>
                <li><span className="font-semibold text-white">AI Accuracy</span>: Confidence quality indicator for analysis output.</li>
              </ul>
            </section>

            <section className="space-y-4 border-b border-slate-800/70 pb-10">
              <SectionTitle id="live-pipelines-table" title="Live Pipelines Table" />
              <p className="text-slate-300 leading-7">
                Live pipelines are sorted newest-first so incident responders can inspect the latest runs immediately.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-300 leading-7">
                <li><span className="font-semibold text-white">Pipeline Name</span>: Jenkins job and build number.</li>
                <li><span className="font-semibold text-white">Branch</span>: Source control branch for the run.</li>
                <li><span className="font-semibold text-white">Commit</span>: Commit hash associated with execution.</li>
                <li><span className="font-semibold text-white">Duration</span>: Total build runtime.</li>
                <li><span className="font-semibold text-white">Status</span>: SUCCESS or FAILED.</li>
                <li><span className="font-semibold text-white">Time</span>: Execution timestamp.</li>
              </ul>
              <p className="text-slate-300 leading-7">
                Table data auto-refreshes, so newly completed builds appear at the top without manual page reload.
              </p>
            </section>

            <section className="space-y-4 border-b border-slate-800/70 pb-10">
              <SectionTitle id="pipeline-flow-visualization" title="Pipeline Flow Visualization" />
              <p className="text-slate-300 leading-7">The flow panel maps each deployment stage in order:</p>
              <CodeBlock
                language="bash"
                code={`Checkout  ->  Build Docker Image  ->  Deploy  ->  Health Check`}
              />
              <p className="text-slate-300 leading-7">Status colors in visualization:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-300 leading-7">
                <li><span className="font-semibold text-emerald-300">Green</span>: Stage succeeded.</li>
                <li><span className="font-semibold text-rose-300">Red</span>: Stage failed.</li>
                <li><span className="font-semibold text-amber-300">Yellow</span>: Stage currently running.</li>
                <li><span className="font-semibold text-slate-300">Gray</span>: Stage pending/not started.</li>
              </ul>
              <p className="text-slate-300 leading-7">Use this panel to immediately isolate the failing stage before opening full logs.</p>
            </section>

            <section className="space-y-4 border-b border-slate-800/70 pb-10">
              <SectionTitle id="ai-analysis" title="AI Analysis" />
              <p className="text-slate-300 leading-7">DCPVAS AI pipeline is optimized for CI/CD failure triage:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-300 leading-7">
                <li>Automatic log parsing and normalization.</li>
                <li>Error pattern extraction from raw build output.</li>
                <li>Failure-stage detection with context signals.</li>
                <li>Probable root cause generation.</li>
              </ul>
              <p className="text-slate-300 leading-7">Primary outputs include Human Summary, Suggested Fix, Technical Recommendation, and Raw Logs.</p>
            </section>

            <section className="space-y-4 border-b border-slate-800/70 pb-10">
              <SectionTitle id="failure-analysis-panel" title="Failure Analysis Panel" />
              <p className="text-slate-300 leading-7">Each failed run opens a multi-tab analysis view:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-300 leading-7">
                <li><span className="font-semibold text-white">Human Summary</span>: Plain-language explanation of what failed.</li>
                <li><span className="font-semibold text-white">Suggested Fix</span>: Action-focused remediation steps.</li>
                <li><span className="font-semibold text-white">Technical Recommendation</span>: Engineer-level root cause detail.</li>
                <li><span className="font-semibold text-white">Raw Logs</span>: Full log transcript for deep debugging.</li>
              </ul>
            </section>

            <section className="space-y-4 pb-2">
              <SectionTitle id="troubleshooting" title="Troubleshooting" />
              <div className="space-y-3">
                <div className="issue-card error">
                  <XCircle className="text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-slate-100">Jenkins not connected</h4>
                    <p className="mt-1 text-slate-300">Verify Jenkins URL, API token validity, and network access to Jenkins.</p>
                  </div>
                </div>
                <div className="issue-card warning">
                  <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-slate-100">No pipelines showing</h4>
                    <p className="mt-1 text-slate-300">Ensure configured Job Name exactly matches the Jenkins pipeline job.</p>
                  </div>
                </div>
                <div className="issue-card warning">
                  <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-slate-100">Logs not loading</h4>
                    <p className="mt-1 text-slate-300">Run the pipeline at least once and confirm logs are available in Jenkins.</p>
                  </div>
                </div>
                <div className="issue-card info">
                  <Info className="text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-slate-100">AI results not visible</h4>
                    <p className="mt-1 text-slate-300">Wait for analysis completion after log ingestion for the selected failed run.</p>
                  </div>
                </div>
              </div>
            </section>
          </article>
      </AppLayout>
    </main>
  );
}
