"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/skeleton";

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

export default function AnalyticsPage() {
  const [ranking, setRanking] = useState<AccountRanking[]>([]);
  const [topVideo, setTopVideo] = useState<TopVideo | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [accountId, setAccountId] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const detailLoading = accountId !== loadedFor;

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
      <h1 className="text-2xl font-semibold">Analytics</h1>

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

          <h2 className="mt-8 text-lg font-medium">Contas por engajamento</h2>
          <p className="text-sm text-[var(--muted)]">Selecione uma conta para ver os detalhes.</p>
          <div className="mt-3 space-y-2">
            {ranking.length === 0 && (
              <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-[var(--muted)]">
                Nenhuma conta conectada ainda.
              </p>
            )}
            {ranking.map((acc, i) => (
              <button
                key={acc.id}
                onClick={() => setAccountId(acc.id === accountId ? "" : acc.id)}
                style={{ animationDelay: `${i * 0.05}s` }}
                className={`nex-rise-in flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                  accountId === acc.id
                    ? "border-sky-500 bg-sky-950/20"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
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
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
                    <div
                      className="nex-gradient-bg h-full rounded-full"
                      style={{ width: `${Math.max(4, (acc.engagement / maxEngagement) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-sm text-[var(--muted)]">{acc.engagement}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {accountId && (
        <div className="mt-8">
          <h2 className="text-lg font-medium">Detalhes de {selected?.persona_name}</h2>

          {detailLoading ? (
            <div className="mt-3 space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-4 gap-3">
                <MiniStat label="Seguidores" value={latestSnapshot?.followers_count ?? "-"} />
                <MiniStat label="Alcance médio" value={avgReach || "-"} />
                <MiniStat label="Posts publicados" value={posts.length} />
                <MiniStat
                  label="Melhor post"
                  value={bestPost && bestPost.score > 0 ? `${bestPost.score} interações` : "-"}
                />
              </div>

              <div className="mt-4 h-72 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={snapshots}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1b2a42" />
                    <XAxis dataKey="date" stroke="#8b98ad" fontSize={12} />
                    <YAxis stroke="#8b98ad" fontSize={12} />
                    <Tooltip contentStyle={{ background: "#0b1424", border: "1px solid #1b2a42" }} />
                    <Legend />
                    <Line type="monotone" dataKey="followers_count" name="Seguidores" stroke="#38bdf8" />
                    <Line type="monotone" dataKey="reach" name="Alcance" stroke="#1d4ed8" />
                    <Line type="monotone" dataKey="profile_views" name="Visitas ao perfil" stroke="#eab308" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <h3 className="mt-6 text-sm font-medium text-neutral-300">Posts publicados</h3>
              <div className="mt-2 space-y-2">
                {posts.length === 0 && <p className="text-neutral-400">Nenhum post publicado ainda.</p>}
                {posts.map((post, i) => {
                  const latest = post.post_analytics?.[0];
                  return (
                    <div
                      key={post.id}
                      style={{ animationDelay: `${i * 0.05}s` }}
                      className="nex-card nex-rise-in rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
                    >
                      <p className="line-clamp-1 text-sm text-neutral-300">{post.caption}</p>
                      <p className="mt-1 text-xs text-neutral-600">
                        {post.published_at ? new Date(post.published_at).toLocaleString("pt-BR") : ""}
                      </p>
                      {latest ? (
                        <div className="mt-2 flex gap-4 text-sm text-neutral-400">
                          <span>❤️ {latest.likes ?? "-"}</span>
                          <span>💬 {latest.comments ?? "-"}</span>
                          <span>🔁 {latest.shares ?? "-"}</span>
                          <span>🔖 {latest.saves ?? "-"}</span>
                          <span>👁 {latest.reach ?? "-"}</span>
                          <span>▶️ {latest.plays ?? "-"}</span>
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="nex-gradient-text mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
