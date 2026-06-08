'use client';
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="px-8 py-5 border-b border-slate-200 bg-white/60 backdrop-blur sticky top-0 z-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
