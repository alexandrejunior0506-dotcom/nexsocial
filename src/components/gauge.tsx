/** Medidor semicircular (0–100%) com o arco desenhando-se ao aparecer. O valor em texto fica no centro. */
export function Gauge({ value, label, size = 200 }: { value: number; label: string; size?: number }) {
  const v = Math.max(0, Math.min(100, value));
  const r = 70;
  const c = Math.PI * r;
  const arc = "M20 90 A70 70 0 0 1 160 90";

  return (
    <div className="relative" style={{ width: size, height: size * 0.6 }}>
      <svg viewBox="0 0 180 104" width={size} height={size * 0.58} aria-hidden className="overflow-visible">
        <defs>
          <linearGradient id="nexGauge" x1="0" x2="1">
            <stop offset="0%" stopColor="#0562fb" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <path d={arc} fill="none" stroke="rgba(100,150,255,0.12)" strokeWidth="14" strokeLinecap="round" />
        {v > 0 && (
          <path
            className="nex-gauge-arc"
            d={arc}
            fill="none"
            stroke="url(#nexGauge)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={`${(v / 100) * c} ${c}`}
            style={{ ["--c" as string]: c, filter: "drop-shadow(0 0 8px rgba(23,169,254,0.65))" }}
          />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="nex-mono nex-gradient-text text-[1.7rem] font-semibold leading-none">{Math.round(v)}%</span>
        <span className="nex-display mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{label}</span>
      </div>
    </div>
  );
}
