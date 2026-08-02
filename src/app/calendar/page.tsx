"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";

interface Post {
  id: string;
  video_url: string;
  caption: string;
  scheduled_at: string;
  status: "draft" | "scheduled" | "processing" | "published" | "failed";
  published_at: string | null;
  error_message: string | null;
  accounts: { persona_name: string; ig_username: string } | null;
}

const STATUS_LABEL: Record<Post["status"], string> = {
  draft: "Rascunho",
  scheduled: "Agendado",
  processing: "Publicando...",
  published: "Publicado",
  failed: "Falhou",
};

const STATUS_COLOR: Record<Post["status"], string> = {
  draft: "text-neutral-400",
  scheduled: "text-blue-400",
  processing: "text-yellow-400",
  published: "text-green-400",
  failed: "text-red-400",
};

export default function CalendarPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/posts");
    const data = await res.json();
    setPosts(data.posts || []);
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/posts")
      .then((res) => res.json())
      .then((data) => {
        setPosts(data.posts || []);
        setLoading(false);
      });
  }, []);

  async function cancelPost(id: string) {
    if (!confirm("Cancelar este post agendado?")) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Calendário</h1>

      {loading && <p className="mt-6 text-neutral-400">Carregando...</p>}
      {!loading && posts.length === 0 && (
        <p className="mt-6 text-neutral-400">Nenhum post agendado ainda.</p>
      )}

      <div className="mt-6 space-y-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <p className="font-medium">{post.accounts?.persona_name ?? "Conta removida"}</p>
                <span className={`text-sm ${STATUS_COLOR[post.status]}`}>
                  {STATUS_LABEL[post.status]}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-neutral-400">{post.caption}</p>
              <p className="mt-1 text-xs text-neutral-600">
                {post.status === "published" && post.published_at
                  ? `Publicado em ${new Date(post.published_at).toLocaleString("pt-BR")}`
                  : `Agendado para ${new Date(post.scheduled_at).toLocaleString("pt-BR")}`}
              </p>
              {post.status === "failed" && post.error_message && (
                <p className="mt-1 text-xs text-red-400">{post.error_message}</p>
              )}
            </div>
            {(post.status === "scheduled" || post.status === "failed") && (
              <button
                onClick={() => cancelPost(post.id)}
                className="rounded-md border border-red-900 px-3 py-1 text-sm text-red-400"
              >
                Cancelar
              </button>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
