"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/skeleton";
import { DayEngagement } from "@/components/day-engagement";
import { CountUp } from "@/components/count-up";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

interface AccountRanking {
  id: string;
  persona_name: string;
  ig_username: string;
  profile_picture_url: string | null;
  followers_count: number | null;
  engagement: number;
}

interface TopVideo {
  id: string;
  caption: string;
  persona_name: string;
  ig_username: string;
  published_at: string | null;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  plays: number;
}

interface Snapshot {
  date: string;
  followers_count: number | null;
  impressions: number | null;
  reach: number | null;
  profile_views: number | null;
}

interface PostAnalytics {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  plays: number | null;
  fetched_at: string;
}

interface Post {
  id: string;
  caption: string;
  published_at: string | null;
  post_analytics: PostAnalytics[];
}

interface LivePostMetrics {
  id: string;
  likes?: number;
  comments?: number;
  shares?: number;
  saved?: number;
  reach?: number;
  plays?: number;
}

interface LiveData {
  account: { followers_count?: number; reach?: number; profile_views?: number };
  posts: LivePostMetrics[];
  fetchedAt: string;
}

export default function AnalyticsPage() {
  const [ranking, setRanking] = useState<AccountRanking[]>([]);
  const [topVideo, setTopVideo] = useState<TopVideo | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [accountId, setAccountId] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const detailLoading = accountId !== loadedFor;

  // Live data is tagged with the account it was fetched for, so switching accounts never shows
  // (or gets stuck on) another account's live numbers/loading state.
  const [liveState, setLiveState] = useState<{
    accountId: string;
    data?: LiveData;
    error?: string;
    loading: boolean;
  } | null>(null);
  const liveForSelected = liveState?.accountId === accountId ? liveState : null;
  const live = liveForSelected?.data ?? null;
  const liveError = liveForSelected?.error ?? null;
  const liveLoading = liveForSelected?.loading ?? false;

  async function fetchLive(id: string) {
    setLiveState({ accountId: id, loading: true });
    try {
      const res = await fetch(`/api/analytics/live?account_id=${id}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Falha ao buscar dados ao vivo");
      setLiveState((prev) => (prev?.accountId === id ? { accountId: id, data, loading: false } : prev));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao buscar dados ao vivo";
      setLiveState((prev) => (prev?.accountId === id ? { accountId: id, error: message, loading: false } : prev));
    }
  }

  useEffect(() => {
    fetch("/api/analytics/overview")
      .then((res) => res.json())
      .then((data) => {
        setRanking(data.accounts || []);
        setTopVideo(data.topVideo || null);
        setOverviewLoading(false);
      })
      .catch(() => setOverviewLoading(false));
  }, []);

  useEffect(() => {
    if (!accountId) return;
    fetch(`/api/analytics?account_id=${accountId}`)
      .then((res) => res.json())
      .then((data) => {
        setSnapshots(data.snapshots || []);
        setPosts(data.posts || []);
        setLoadedFor(accountId);
      })
      .catch(() => setLoadedFor(accountId));
  }, [accountId]);

  const selected = ranking.find((a) => a.id === accountId);
  const maxEngagement = Math.max(1, ...ranking.map((a) => a.engagement));

  const latestSnapshot = snapshots[snapshots.length - 1];
  const avgReach = snapshots.length
    ? Math.round(snapshots.reduce((s, snap) => s + (snap.reach ?? 0), 0) / snapshots.length)
    : 0;
  const bestPost = posts
    .map((p) => ({
      post: p,
      score:
        (p.post_analytics?.[0]?.likes ?? 0) +
        (p.post_analytics?.[0]?.comments ?? 0) +
        (p.post_analytics?.[0]?.shares ?? 0) +
        (p.post_analytics?.[0]?.saves ?? 0),
    }))
    .sort((a, b) => b.score - a.score)[0];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Desempenho"
        title="Analytics"
        subtitle="Cada vídeo, cada conta: o que saiu, quanto alcançou e quanto engajou."
      />

      <DayEngagement />

      {overviewLoading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          {topVideo && (
            <div className="nex-card nex-rise-in mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="text-sm text-[var(--muted)]">🏆 Vídeo mais engajado</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {topVideo.persona_name}{" "}
                    <span className="font-normal text-neutral-500">@{topVideo.ig_username}</span>
                  </p>
                  <p className="mt-0.5 line-clamp-1 max-w-md text-sm text-neutral-400">
                    {topVideo.caption || "Sem legenda"}
                  </p>
                </div>
                <div className="flex gap-4 text-sm text-neutral-300">
                  <span>❤️ {topVideo.likes}</span>
                  <span>💬 {topVideo.comments}</span>
                  <span>🔁 {topVideo.shares}</span>
                  <span>🔖 {topVideo.saves}</span>
                  <span>▶️ {topVideo.plays}</span>
                </div>
              </div>
            </div>
          )}

          <span className="nex-eyebrow mt-10">Ranking</span>
          <h2 className="mt-1.5 text-lg font-semibold">Contas por engajamento</h2>
          <p className="text-sm text-[var(--muted)]">Selecione uma conta para ver os detalhes.</p>
          <div className="mt-3 space-y-2">
            {ranking.length === 0 && (
              <EmptyState variant="accounts" title="Nenhuma conta conectada ainda" actionHref="/accounts" actionLabel="Conectar conta" />
            )}
            {ranking.map((acc, i) => (
              <button
                key={acc.id}
                onClick={() => setAccountId(acc.id === accountId ? "" : acc.id)}
                style={{ animationDelay: `${i * 0.05}s` }}
                className={`nex-card nex-rise-in flex w-full items-center gap-3 rounded-[4px_16px_4px_16px] border p-3 text-left ${
                  accountId === acc.id
                    ? "border-sky-500 bg-sky-950/30 shadow-[0_0_28px_-10px_rgba(23,169,254,0.8)]"
                    : "border-[var(--line)] bg-[var(--glass)]"
                }`}
              >
                {acc.profile_picture_url ? (
                  <Image
                    src={acc.profile_picture_url}
                    alt={acc.ig_username}
                    width={36}
                    height={36}
                    unoptimized
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="nex-gradient-bg flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">
                    {acc.persona_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium">{acc.persona_name}</p>
                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      {acc.followers_count != null ? `${acc.followers_count} seguidores` : "sem dados"}
                    </span>
                  </div>
                  <div className="nex-bar mt-1.5 !h-1.5">
                    <i style={{ width: `${Math.max(4, (acc.engagement / maxEngagement) * 100)}%`, animationDelay: `${0.15 + i * 0.06}s` }} />
                  </div>
                </div>
                <span className="nex-mono shrink-0 text-sm text-[var(--muted)]">{acc.engagement}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {accountId && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="nex-eyebrow">Conta</span>
              <h2 className="mt-1.5 text-xl font-semibold">Detalhes de {selected?.persona_name}</h2>
            </div>
            <div className="flex items-center gap-2">
              {live && (
                <span className="text-xs text-[var(--muted)]">
                  Ao vivo às {new Date(live.fetchedAt).toLocaleTimeString("pt-BR")}
                </span>
              )}
              <button
                onClick={() => fetchLive(accountId)}
                disabled={liveLoading}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--surface-hover)] disabled:opacity-50"
              >
                {liveLoading ? "Buscando..." : "🔴 Atualizar agora"}
              </button>
            </div>
          </div>
          {liveError && <p className="mt-2 text-xs text-red-400">{liveError}</p>}

          {detailLoading ? (
            <div className="mt-3 space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
          ) : (
            <>
              <div className="nex-stagger mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MiniStat
                  label="Seguidores"
                  value={live?.account.followers_count ?? latestSnapshot?.followers_count ?? "-"}
                />
                <MiniStat label="Alcance médio" value={live?.account.reach ?? (avgReach || "-")} />
                <MiniStat label="Posts publicados" value={posts.length} />
                <MiniStat
                  label="Melhor post"
                  value={bestPost && bestPost.score > 0 ? `${bestPost.score} interações` : "-"}
                />
              </div>

              <div className="nex-card nex-beam mt-4 h-80 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={snapshots} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nexFillReach" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#17a9fe" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#17a9fe" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="nexFillFollowers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6d8bff" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6d8bff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(100,150,255,0.12)" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#8a9bbd", fontSize: 11 }} dy={6} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8a9bbd", fontSize: 11 }} />
                    <Tooltip
                      cursor={{ stroke: "rgba(110,170,255,0.3)" }}
                      contentStyle={{ background: "#0a1224", border: "1px solid #1a2b4d", borderRadius: 12, color: "#f1f5fd" }}
                      labelStyle={{ color: "#8a9bbd" }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#8a9bbd" }} />
                    <Area type="monotone" dataKey="reach" name="Alcance" stroke="#17a9fe" strokeWidth={2.5} fill="url(#nexFillReach)" animationDuration={1400} />
                    <Area type="monotone" dataKey="followers_count" name="Seguidores" stroke="#6d8bff" strokeWidth={2} fill="url(#nexFillFollowers)" animationDuration={1600} />
                    <Area type="monotone" dataKey="profile_views" name="Visitas ao perfil" stroke="#ffb547" strokeWidth={2} fill="none" animationDuration={1800} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <span className="nex-eyebrow mt-8">Vídeos</span>
              <h3 className="mt-1.5 text-base font-semibold">Posts publicados</h3>
              <div className="mt-2 space-y-2">
                {posts.length === 0 && (
                  <EmptyState variant="video" title="Nenhum post publicado ainda" compact />
                )}
                {posts.map((post, i) => {
                  const cached = post.post_analytics?.[0];
                  const liveMetrics = live?.posts.find((p) => p.id === post.id);
                  const isLive = !!liveMetrics;
                  const likes = liveMetrics?.likes ?? cached?.likes;
                  const comments = liveMetrics?.comments ?? cached?.comments;
                  const shares = liveMetrics?.shares ?? cached?.shares;
                  const saves = liveMetrics?.saved ?? cached?.saves;
                  const reach = liveMetrics?.reach ?? cached?.reach;
                  const plays = liveMetrics?.plays ?? cached?.plays;
                  const hasAny = likes != null || comments != null || cached || liveMetrics;
                  return (
                    <div
                      key={post.id}
                      style={{ animationDelay: `${i * 0.05}s` }}
                      className="nex-card nex-rise-in rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
                    >
                      <div className="flex items-center gap-2">
                        <p className="line-clamp-1 text-sm text-neutral-300">{post.caption}</p>
                        {isLive && (
                          <span className="shrink-0 rounded-full bg-red-950/40 px-1.5 py-0.5 text-[10px] text-red-400">
                            ao vivo
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-neutral-600">
                        {post.published_at ? new Date(post.published_at).toLocaleString("pt-BR") : ""}
                      </p>
                      {hasAny ? (
                        <div className="mt-2 flex gap-4 text-sm text-neutral-400">
                          <span>❤️ {likes ?? "-"}</span>
                          <span>💬 {comments ?? "-"}</span>
                          <span>🔁 {shares ?? "-"}</span>
                          <span>🔖 {saves ?? "-"}</span>
                          <span>👁 {reach ?? "-"}</span>
                          <span>▶️ {plays ?? "-"}</span>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-neutral-600">Sem métricas ainda.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="nex-card nex-beam rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="nex-display text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="nex-gradient-text nex-mono mt-2 text-2xl font-semibold leading-tight">
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </p>
    </div>
  );
}
