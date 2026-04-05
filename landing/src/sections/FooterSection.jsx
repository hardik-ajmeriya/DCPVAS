export default function FooterSection() {
  return (
    <footer className="mt-4 border-t border-white/5 bg-black/40 py-8 text-sm text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold text-white">DCPVAS</p>
          <p className="text-xs text-slate-500">AI CI/CD Intelligence</p>
        </div>
        <nav className="flex flex-wrap gap-4 text-xs">
          <a href="#features" className="hover:text-slate-200">Features</a>
          <a href="#docs" className="hover:text-slate-200">Docs</a>
          <a href="#pricing" className="hover:text-slate-200">Pricing</a>
          <a href="#about" className="hover:text-slate-200">About</a>
        </nav>
        <div className="flex flex-col items-start gap-2 text-xs sm:items-end">
          <div className="flex gap-3">
            <a href="#" className="hover:text-slate-200">Twitter</a>
            <a href="#" className="hover:text-slate-200">GitHub</a>
            <a href="#" className="hover:text-slate-200">LinkedIn</a>
          </div>
          <p className="text-[11px] text-slate-500">© {new Date().getFullYear()} DCPVAS, Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
