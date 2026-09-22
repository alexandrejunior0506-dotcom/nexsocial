"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Skeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/empty-state";

const TZ = "America/Sao_Paulo";

interface Metrics {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  plays: number | null;
  fetched_at: string;
}

interface DayPost {
  id: string;
  account_id: string;
  persona_name: string;
  ig_username: string;
  profile_picture_url: string | null;
  published_at: string | null;
  metrics: Metrics | null;
}

interface LiveMetrics {
  id: string;
  likes?: number;
  comments?: number;
  shares?: number;
  saved?: number;
  reach?: number;
  plays?: number;
}

interface Values {
  plays: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
}

function todayBR(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

function timeBR(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

const num = (n: number | null | undefined) => (n == null ? "-" : n.toLocaleString("pt-BR"));
const sum = (values: (number | null)[]) => values.reduce<number>((total, v) => total + (v ?? 0), 0);

/** Engagement of every video published on one day, per account, video by video. */
export function DayEngagement() {
  const [date, setDate] = useState(() => todayBR());
  const [loaded, setLoaded] = useState<{ date: string; posts: DayPost[]; error?: boolean } | null>(null);
  const [live, setLive] = useState<{
    date: string;
    byId: Record<string, LiveMetrics>;
    fetchedAt: string;
    failed: number;
  } | null>(null);
  const [liveState, setLiveState] = useState<{ date: string; loading: boolean; error?: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch(`/api/analytics/day?date=${date}`)
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (data.error) setLoaded({ date, posts: [], error: true });
        else setLoaded({ date, posts: data.posts ?? [] });
      })
      .catch(() => {
        if (!ignore) setLoaded({ date, posts: [], error: true });
      });
    return () => {
      ignore = true;
    };
  }, [date]);

  async function refreshLive() {
    const target = date;
    setLiveState({ date: target, loading: true });
    try {
      const res = await fetch(`/api/analytics/day/live?date=${target}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Falha ao buscar dados ao vivo");
      const byId: Record<string, LiveMetrics> = {};
      for (const p of data.posts as LiveMetrics[]) byId[p.id] = p;
      setLive({ date: target, byId, fetchedAt: data.fetchedAt, failed: data.failed ?? 0 });
      setLiveState((prev) => (prev?.date === target ? { date: target, loading: false } : prev));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao buscar dados ao vivo";
      setLiveState((prev) => (prev?.date === target ? { date: target, loading: false, error: message } : prev));
    }
  }

  const loading = loaded?.date !== date;
  const posts = loaded?.date === date ? loaded.posts : [];
  const liveForDate = live?.date === date ? live : null;
  const liveLoading = liveState?.date === date && liveState.loading;
  const liveError = liveState?.date === date ? liveState.error : undefined;

  function valuesOf(post: DayPost): Values {
    const l = liveForDate?.byId[post.id];
    const m = post.metrics;
    return {
      plays: l?.plays ?? m?.plays ?? null,
      reach: l?.reach ?? m?.reach ?? null,
      likes: l?.likes ?? m?.likes ?? null,
      comments: l?.comments ?? m?.comments ?? null,
      shares: l?.shares ?? m?.shares ?? null,
      saves: l?.saved ?? m?.saves ?? null,
    };
  }

  const groups = new Map<string, { name: string; username: string; avatar: string | null; posts: DayPost[] }>();
  for (const post of posts) {
    const g = groups.get(post.account_id) ?? {
      name: post.persona_name,
      username: post.ig_username,
      avatar: post.profile_picture_url,
      posts: [],
    };
    g.posts.push(post);
    groups.set(post.account_id, g);
  }
  const accounts = [...groups.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));

  const allValues = posts.map(valuesOf);
  const lastSaved = posts.map((p) => p.metrics?.fetched_at).filter((v): v is string => !!v).sort().at(-1);
  const today = todayBR();

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Engajamento por vídeo</h2>
          <p className="text-sm text-[var(--muted)]">Vídeos publicados no dia, conta por conta.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setDate(todayBR())}
            className={`rounded-md border px-3 py-1.5 text-xs ${date === today ? "border-sky-500 text-sky-300" : "border-[var(--border)] hover:bg-[var(--surface-hover)]"}`}
          >
            Hoje
          </button>
          <button
            onClick={() => setDate(todayBR(-1))}
            className={`rounded-md border px-3 py-1.5 text-xs ${date === todayBR(-1) ? "border-sky-500 text-sky-300" : "border-[var(--border)] hover:bg-[var(--surface-hover)]"}`}
          >
            Ontem
          </button>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-white outline-none focus:border-sky-500"
          />
          <button
            onClick={refreshLive}
            disabled={liveLoading || loading}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--surface-hover)] disabled:opacity-50"
          >
            {liveLoading ? "Buscando..." : "🔴 Atualizar agora"}
          </button>
        </div>
      </div>

      {liveError && <p className="mt-2 text-xs text-red-400">{liveError}</p>}
      {!loading && posts.length > 0 && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          {liveForDate
            ? `Ao vivo às ${timeBR(liveForDate.fetchedAt)}${liveForDate.failed ? ` (${liveForDate.failed} vídeo(s) não responderam, mostrando o último valor salvo)` : ""}.`
            : lastSaved
              ? `Última coleta automática às ${timeBR(lastSaved)} (o sistema coleta sozinho de 4 em 4 horas). Clique em "Atualizar agora" para ver os números atuais.`
              : "Ainda sem coleta de métricas para estes vídeos — clique em \"Atualizar agora\"."}
        </p>
      )}

      {loading && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!loading && loaded?.error && (
        <p className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-red-400">
          Não consegui carregar os vídeos desse dia.
        </p>
      )}

      {!loading && !loaded?.error && posts.length === 0 && (
        <div className="mt-4">
          <EmptyState variant="video" title="Nenhum vídeo publicado nesse dia" description="Escolha outra data ou confira o calendário." compact />
        </div>
      )}

      {!loading && posts.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Total label="Vídeos" value={posts.length} />
            <Total label="Visualizações" value={sum(allValues.map((v) => v.plays))} />
            <Total label="Alcance" value={sum(allValues.map((v) => v.reach))} />
            <Total label="Curtidas" value={sum(allValues.map((v) => v.likes))} />
            <Total label="Comentários" value={sum(allValues.map((v) => v.comments))} />
            <Total label="Compart." value={sum(allValues.map((v) => v.shares))} />
            <Total label="Salvos" value={sum(allValues.map((v) => v.saves))} />
          </div>

          <div className="mt-4 space-y-4">
            {accounts.map(([id, g]) => {
              const rows = g.posts.map((p) => ({ post: p, v: valuesOf(p) }));
              return (
                <div key={id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex items-center gap-3">
                    {g.avatar ? (
                      <Image
                        src={g.avatar}
                        alt={g.username}
                        width={32}
                        height={32}
                        unoptimized
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="nex-gradient-bg flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{g.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {rows.length} vídeo(s) · {num(sum(rows.map((r) => r.v.plays)))} visualizações ·{" "}
                        {num(sum(rows.map((r) => r.v.likes)))} curtidas
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="nex-mono w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="text-left text-xs text-[var(--muted)]">
                          <th className="py-1 pr-3 font-normal">Vídeo</th>
                          <th className="px-2 py-1 text-right font-normal">Views</th>
                          <th className="px-2 py-1 text-right font-normal">Alcance</th>
                          <th className="px-2 py-1 text-right font-normal">Curtidas</th>
                          <th className="px-2 py-1 text-right font-normal">Coment.</th>
                          <th className="px-2 py-1 text-right font-normal">Compart.</th>
                          <th className="pl-2 py-1 text-right font-normal">Salvos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ post, v }, i) => (
                          <tr key={post.id} className="border-t border-[var(--border)] text-neutral-300">
                            <td className="py-1.5 pr-3">
                              <span className="text-neutral-500">#{i + 1}</span> · {timeBR(post.published_at)}
                            </td>
                            <td className="px-2 py-1.5 text-right">{num(v.plays)}</td>
                            <td className="px-2 py-1.5 text-right">{num(v.reach)}</td>
                            <td className="px-2 py-1.5 text-right">{num(v.likes)}</td>
                            <td className="px-2 py-1.5 text-right">{num(v.comments)}</td>
                            <td className="px-2 py-1.5 text-right">{num(v.shares)}</td>
                            <td className="pl-2 py-1.5 text-right">{num(v.saves)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="nex-gradient-text nex-mono mt-1 text-xl font-semibold">{value.toLocaleString("pt-BR")}</p>
    </div>
  );
}
