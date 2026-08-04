"use client";

import { useEffect, useState } from "react";
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

interface Account {
  id: string;
  persona_name: string;
  ig_username: string;
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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.accounts || []);
        if (data.accounts?.[0]) setAccountId(data.accounts[0].id);
      });
  }, []);

  useEffect(() => {
    if (!accountId) return;
    fetch(`/api/analytics?account_id=${accountId}`)
      .then((res) => res.json())
      .then((data) => {
        setSnapshots(data.snapshots || []);
        setPosts(data.posts || []);
        setLoading(false);
      });
  }, [accountId]);

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-white"
        >
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.persona_name} (@{acc.ig_username})
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!loading && (
        <>
          <div className="mt-6 h-80 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={snapshots}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1b2a42" />
                <XAxis dataKey="date" stroke="#8b98ad" fontSize={12} />
                <YAxis stroke="#8b98ad" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "#0b1424", border: "1px solid #1b2a42" }}
                />
                <Legend />
                <Line type="monotone" dataKey="followers_count" name="Seguidores" stroke="#38bdf8" />
                <Line type="monotone" dataKey="reach" name="Alcance" stroke="#1d4ed8" />
                <Line type="monotone" dataKey="profile_views" name="Visitas ao perfil" stroke="#eab308" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h2 className="mt-8 text-lg font-medium">Posts publicados</h2>
          <div className="mt-3 space-y-2">
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
    </AppShell>
  );
}
