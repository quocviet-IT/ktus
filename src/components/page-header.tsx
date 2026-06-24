export default function PageHeader({ crumb, title, children }: { crumb: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-card border-b border-line sticky top-0 z-10 flex-wrap">
      <div>
        <div className="font-mono text-[10.5px] text-muted">{crumb}</div>
        <h1 className="font-serif text-xl m-0">{title}</h1>
      </div>
      <div className="flex-1" />
      {children}
    </div>
  );
}
