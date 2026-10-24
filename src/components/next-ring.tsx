"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TZ = "America/Sao_Paulo";
const R = 86;
const C = 2 * Math.PI * R;
const MAX_WINDOW_MS = 6 * 60 * 60 * 1000;

function fmtCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${p(h)}h`;
  if (h > 0) return `${p(h)}:${p(m)}:${p(s)}`;
  return `${p(m)}:${p(s)}`;
}

function fmtWhen(target: number) {
  const day = (t: number) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(t);
  const time = new Date(target).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  if (day(target) === day(Date.now())) return time;
  const date = new Date(target).toLocaleDateString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" });
  return `${date} ${time}`;
}

/**
 * Anel de contagem regressiva até a próxima publicação da fila (de todas as contas).
 * O arco enche conforme o horário se aproxima e um satélite percorre o anel.
 * Quando o horário passa, mostra "Publicando…" e recarrega os dados da página sozinho.
 */
export function NextRing({
  targetIso,
  startIso,
  who,
}: {
  targetIso: string | null;
  startIso: string | null;
  who?: string | null;
}) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const target = targetIso ? new Date(targetIso).getTime() : null;
  const start = startIso ? new Date(startIso).getTime() : null;
  const remaining = target !== null && now !== null ? target - now : null;
  const overdue = remaining !== null && remaining <= 0;

  useEffect(() => {
    if (!overdue) return;
    const id = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(id);
  }, [overdue, router]);

  const windowMs = target !== null && start !== null ? Math.min(Math.max(target - start, 60_000), MAX_WINDOW_MS) : 3_600_000;
  const progress = remaining === null ? 0 : Math.min(1, Math.max(0, 1 - remaining / windowMs));
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  const sat = { x: 100 + R * Math.cos(angle), y: 100 + R * Math.sin(angle) };

  const label = target === null ? "FILA VAZIA" : overdue ? "PUBLICANDO" : "PRÓXIMA PUBLICAÇÃO";
  const digits = target === null ? "--:--" : remaining === null ? "--:--:--" : overdue ? "agora" : fmtCountdown(remaining);
  const sub = target === null ? "nada agendado" : `${fmtWhen(target)}${who ? ` · ${who}` : ""}`;

  return (
    <div className="relative mx-auto aspect-square w-[min(100%,236px)]" role="timer" aria-label={`${label}: ${digits}`}>
      <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="nexRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#17a9fe" />
            <stop offset="60%" stopColor="#0562fb" />
            <stop offset="100%" stopColor="#6d8bff" />
          </linearGradient>
        </defs>
        <circle className="nex-ring-outer" cx="100" cy="100" r="97" />
        <circle className="nex-ring-track" cx="100" cy="100" r={R} />
        <circle
          className="nex-ring-arc"
          cx="100"
          cy="100"
          r={R}
          stroke="url(#nexRingGrad)"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          transform="rotate(-90 100 100)"
        />
        {target !== null && (
          <>
            <circle cx={sat.x} cy={sat.y} r="9" fill="rgba(190,225,255,0.22)" />
            <circle className="nex-ring-sat" cx={sat.x} cy={sat.y} r="3.4" />
          </>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
        <span className="nex-display text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{label}</span>
        <span className={`nex-mono nex-gradient-text text-[2rem] font-semibold leading-none ${overdue ? "animate-pulse" : ""}`}>
          {digits}
        </span>
        <span className="nex-mono max-w-[75%] truncate text-[11px] text-[var(--faint)]">{sub}</span>
      </div>
    </div>
  );
}
