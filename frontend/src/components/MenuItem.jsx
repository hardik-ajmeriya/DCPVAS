export default function MenuItem({ icon: Icon, label, isActive, collapsed, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-center rounded-xl border text-left transition-all duration-300 ${
        collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
      } ${
        isActive
          ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.25)]'
          : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-slate-800/80 hover:text-slate-100'
      }`}
      title={collapsed ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'}`} />

      <span
        className={`truncate text-sm font-medium transition-all duration-300 ${
          collapsed ? 'max-w-0 opacity-0' : 'max-w-[160px] opacity-100'
        }`}
      >
        {label}
      </span>

      {collapsed && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-slate-900 px-2 py-1 text-xs text-slate-100 opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
        >
          {label}
        </span>
      )}
    </button>
  );
}
