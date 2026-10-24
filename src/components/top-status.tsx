"use client";

import { useEffect, useState } from "react";
import { Timer, Zap } from "lucide-react";

const TZ = "America/Sao_Paulo";

interface TodayStatus {
  published: number;
  pending: number;
  failed: number;
  total: number;
  next: { at: string; who: string | null } | null;
}

/** Relógio de Brasília na barra superior (atualiza a cada 20s). */
export function TopClock() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 20000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  if (now === null) return <span className="nex-mono h-4 w-40 text-xs text-[var(--faint)]">&nbsp;</span>;
  const d = new Date(now);
  const wk = d.toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "short" }).replace(".", "");
  const day = d.toLocaleDateString("pt-BR", { timeZone: TZ, day: "2-digit", month: "short" }).replace(".", "");
  const time = d.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  return (
    <span className="nex-mono flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--muted)]">
      <span className="nex-pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--ok)]" />
      {wk} · {day} · <b className="font-semibold text-[var(--foreground)]">{time}</b>
    </span>
  );
}

function cd(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${p(h)}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

/** Progresso do dia + contagem até a próxima publicação, sempre à vista (estilo "meta do mês" do VORTEXBOT). */
export function TopStatus() {
  const [status, setStatus] = useState<TodayStatus | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/status/today")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d && !d.error) setStatus(d);
        })
        .catch(() => {});
    load();
    const poll = setInterval(load, 60000);
    const first = setTimeout(() => setNow(Date.now()), 0);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(poll);
      clearTimeout(first);
      clearInterval(tick);
    };
  }, []);

  if (!status) return <div className="nex-skeleton h-[46px] w-[250px] rounded-xl" aria-hidden />;

  const pct = status.total ? Math.round((status.published / status.total) * 100) : 0;
  const target = status.next ? new Date(status.next.at).getTime() : null;
  const left = target !== null && now !== null ? target - now : null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--glass)] px-3 py-1.5 backdrop-blur">
      <span className="nex-icon-chip h-8 w-8 shrink-0">
        <Zap size={16} />
      </span>
      <div className="w-[118px]">
        <div className="flex items-baseline justify-between">
          <span className="nex-display text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Hoje</span>
          <span className="nex-mono text-[11px] font-semibold text-[var(--accent-solid)]">
            {status.published}/{status.total}
          </span>
        </div>
        <div className="nex-bar mt-1 !h-1">
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="hidden h-7 w-px bg-[var(--line)] md:block" />
      <div className="hidden items-center gap-2 md:flex">
        <Timer size={15} className="text-[var(--accent-solid)]" />
        <div className="leading-tight">
          <span className="nex-display block text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Próxima</span>
          <span className="nex-mono text-[13px] font-semibold">
            {left === null ? (target === null ? "—" : "--:--") : left <= 0 ? "agora" : cd(left)}
          </span>
        </div>
      </div>
    </div>
  );
}
