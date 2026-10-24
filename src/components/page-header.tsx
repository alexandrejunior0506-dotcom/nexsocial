import type { ReactNode } from "react";

/** Cabeçalho padrão das páginas: rótulo, título grande, subtítulo com filete e área de ações. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="nex-reveal mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="nex-eyebrow">{eyebrow}</span>
        <h1 className="mt-2 text-[30px] font-bold leading-tight tracking-tight sm:text-[38px]">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 border-l-2 border-[var(--accent-from)]/60 pl-3 text-[14px] text-[var(--muted)] sm:text-[15px]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
