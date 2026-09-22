import Link from "next/link";

type Variant = "accounts" | "calendar" | "chart" | "video";

/**
 * Branded empty state with a small custom illustration (instead of plain text), used wherever a
 * list/table can be legitimately empty — first run, no data yet, nothing scheduled today, etc.
 */
export function EmptyState({
  variant,
  title,
  description,
  actionHref,
  actionLabel,
  compact,
}: {
  variant: Variant;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-center ${
        compact ? "gap-2 p-6" : "gap-3 p-10"
      }`}
    >
      <Illustration variant={variant} size={compact ? 72 : 108} />
      <p className={`font-medium ${compact ? "text-sm" : "text-base"}`}>{title}</p>
      {description && <p className="max-w-sm text-sm text-[var(--muted)]">{description}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="nex-gradient-bg mt-1 rounded-md px-4 py-2 text-sm font-medium text-white">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

function Illustration({ variant, size }: { variant: Variant; size: number }) {
  const common = { width: size, height: size, viewBox: "0 0 120 120", fill: "none" as const };

  if (variant === "accounts") {
    return (
      <svg {...common}>
        <circle cx="60" cy="60" r="46" fill="url(#ac-glow)" opacity="0.5" />
        <circle cx="38" cy="52" r="16" stroke="var(--border)" strokeWidth="2" fill="var(--surface)" />
        <circle cx="38" cy="52" r="16" stroke="var(--accent-solid)" strokeWidth="1.5" strokeDasharray="3 4" opacity="0.6" />
        <circle cx="70" cy="70" r="20" stroke="var(--border)" strokeWidth="2" fill="var(--surface)" />
        <path d="M62 70a8 8 0 1 1 16 0 8 8 0 0 1-16 0Z" stroke="var(--accent-solid)" strokeWidth="2" />
        <circle cx="86" cy="60" r="4" fill="var(--accent-solid)" />
        <circle cx="30" cy="80" r="3" fill="var(--accent-solid)" opacity="0.6" />
        <path d="M52 60c4-4 10-4 14 0" stroke="var(--accent-solid)" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 5" />
        <defs>
          <radialGradient id="ac-glow" cx="0" cy="0" r="1" gradientTransform="translate(60 60) rotate(90) scale(46)">
            <stop stopColor="var(--accent-from)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--accent-to)" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  if (variant === "calendar") {
    return (
      <svg {...common}>
        <circle cx="60" cy="60" r="46" fill="url(#cal-glow)" opacity="0.5" />
        <rect x="28" y="34" width="64" height="56" rx="8" stroke="var(--border)" strokeWidth="2" fill="var(--surface)" />
        <path d="M28 48h64" stroke="var(--border)" strokeWidth="2" />
        <path d="M44 28v12M76 28v12" stroke="var(--accent-solid)" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="40" y="58" width="10" height="10" rx="2" fill="var(--surface-hover)" />
        <rect x="55" y="58" width="10" height="10" rx="2" fill="var(--surface-hover)" />
        <rect x="70" y="58" width="10" height="10" rx="2" stroke="var(--accent-solid)" strokeWidth="1.5" strokeDasharray="2 3" />
        <rect x="40" y="73" width="10" height="10" rx="2" fill="var(--surface-hover)" />
        <path d="M75 74v8M71 78h8" stroke="var(--accent-solid)" strokeWidth="2" strokeLinecap="round" />
        <defs>
          <radialGradient id="cal-glow" cx="0" cy="0" r="1" gradientTransform="translate(60 60) rotate(90) scale(46)">
            <stop stopColor="var(--accent-from)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--accent-to)" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  if (variant === "video") {
    return (
      <svg {...common}>
        <circle cx="60" cy="60" r="46" fill="url(#vid-glow)" opacity="0.5" />
        <rect x="40" y="24" width="40" height="70" rx="10" stroke="var(--border)" strokeWidth="2" fill="var(--surface)" />
        <rect x="46" y="34" width="28" height="44" rx="4" fill="var(--surface-hover)" />
        <path d="M56 48l12 8-12 8V48Z" fill="var(--accent-solid)" />
        <path d="M56 84h8" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 56l8 4-8 4v-8Z" stroke="var(--accent-solid)" strokeWidth="1.5" opacity="0.6" />
        <path d="M90 56l8 4-8 4v-8Z" stroke="var(--accent-solid)" strokeWidth="1.5" opacity="0.6" transform="rotate(180 94 60)" />
        <defs>
          <radialGradient id="vid-glow" cx="0" cy="0" r="1" gradientTransform="translate(60 60) rotate(90) scale(46)">
            <stop stopColor="var(--accent-from)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--accent-to)" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="60" cy="60" r="46" fill="url(#ch-glow)" opacity="0.5" />
      <path d="M30 88V58M50 88V44M70 88V64M90 88V36" stroke="var(--border)" strokeWidth="6" strokeLinecap="round" />
      <path
        d="M30 66c8-8 12-16 20-10 6 5 12-14 20-8 6 4 12-16 20-4"
        stroke="var(--accent-solid)"
        strokeWidth="2"
        strokeDasharray="3 4"
        strokeLinecap="round"
      />
      <circle cx="90" cy="30" r="4" fill="var(--accent-solid)" />
      <defs>
        <radialGradient id="ch-glow" cx="0" cy="0" r="1" gradientTransform="translate(60 60) rotate(90) scale(46)">
          <stop stopColor="var(--accent-from)" stopOpacity="0.18" />
          <stop offset="1" stopColor="var(--accent-to)" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
