export default function AppLayout({ sidebar, children, className = "" }) {
  return (
    <div className={`app-layout ${className}`.trim()}>
      {sidebar}
      <div className="main-content">
        <div className="content-wrapper">{children}</div>
      </div>
    </div>
  );
}
