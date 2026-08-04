"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppShell } from "@/components/app-shell";
import { DateTimePicker } from "@/components/date-time-picker";
import { Skeleton } from "@/components/skeleton";
import { useUi } from "@/components/ui-provider";

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

const STATUS_DOT: Record<Post["status"], string> = {
  draft: "bg-neutral-500",
  scheduled: "bg-sky-500",
  processing: "bg-yellow-500",
  published: "bg-green-500",
  failed: "bg-red-500",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const EDITABLE_STATUSES: Post["status"][] = ["scheduled", "failed", "draft"];

export default function CalendarPage() {
  const { showToast, confirm } = useUi();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

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
    const ok = await confirm("Cancelar este post agendado?");
    if (!ok) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    showToast("Post cancelado.");
    load();
  }

  function openEdit(post: Post) {
    setEditingPost(post);
    setEditCaption(post.caption);
    setEditScheduledAt(format(new Date(post.scheduled_at), "yyyy-MM-dd'T'HH:mm"));
  }

  async function saveEdit() {
    if (!editingPost) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${editingPost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: editCaption,
          scheduled_at: new Date(editScheduledAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showToast("Post atualizado.");
      setEditingPost(null);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  }

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { locale: ptBR });
    const end = endOfWeek(endOfMonth(month), { locale: ptBR });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      const key = format(new Date(post.scheduled_at), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    }
    return map;
  }, [posts]);

  const selectedPosts = selectedDay ? postsByDay.get(selectedDay) ?? [] : [];

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold capitalize">
          {format(month, "MMMM yyyy", { locale: ptBR })}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)]"
          >
            ‹
          </button>
          <button
            onClick={() => setMonth(new Date())}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)]"
          >
            Hoje
          </button>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-hover)]"
          >
            ›
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-6 grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="mt-6 overflow-hidden rounded-xl border border-[var(--border)]">
          <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface)]">
            {WEEKDAYS.map((d) => (
              <div key={d} className="p-2 text-center text-xs font-medium text-[var(--muted)]">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayPosts = postsByDay.get(key) ?? [];
              const inMonth = isSameMonth(day, month);
              return (
                <div
                  key={key}
                  onClick={() => setSelectedDay(dayPosts.length ? key : null)}
                  className={`flex min-h-28 flex-col gap-1 border-b border-r border-[var(--border)] p-2 text-left align-top last:border-r-0 ${
                    inMonth ? "bg-[var(--background)]" : "bg-[var(--background)]/40"
                  } ${dayPosts.length ? "cursor-pointer hover:bg-[var(--surface-hover)]" : "cursor-default"}`}
                >
                  <span
                    className={`text-xs ${
                      isToday(day)
                        ? "nex-gradient-bg inline-flex h-5 w-5 items-center justify-center rounded-full text-white"
                        : inMonth
                          ? "text-neutral-300"
                          : "text-neutral-600"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="flex flex-col gap-1">
                    {dayPosts.slice(0, 3).map((post) => (
                      <button
                        key={post.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (EDITABLE_STATUSES.includes(post.status)) openEdit(post);
                          else setSelectedDay(key);
                        }}
                        className="flex items-center gap-1 truncate rounded bg-[var(--surface)] px-1.5 py-0.5 text-left text-[11px] text-neutral-300 hover:bg-[var(--surface-hover)]"
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[post.status]}`} />
                        <span className="truncate">
                          {format(new Date(post.scheduled_at), "HH:mm")} ·{" "}
                          {post.accounts?.persona_name ?? "?"}
                        </span>
                      </button>
                    ))}
                    {dayPosts.length > 3 && (
                      <span className="text-[11px] text-[var(--muted)]">+{dayPosts.length - 3} mais</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedDay && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium capitalize">
              {format(new Date(selectedDay), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h2>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-sm text-[var(--muted)] hover:text-white"
            >
              Fechar
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {selectedPosts.map((post, i) => (
              <div
                key={post.id}
                style={{ animationDelay: `${i * 0.05}s` }}
                className="nex-card nex-rise-in flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-medium">{post.accounts?.persona_name ?? "Conta removida"}</p>
                    <span className="flex items-center gap-1.5 text-sm text-neutral-300">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[post.status]}`} />
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
                {EDITABLE_STATUSES.includes(post.status) && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => openEdit(post)}
                      className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--surface-hover)]"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => cancelPost(post.id)}
                      className="rounded-md border border-red-900/60 px-3 py-1 text-sm text-red-400 hover:bg-red-950/40"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && posts.length === 0 && (
        <p className="mt-6 text-[var(--muted)]">Nenhum post agendado ainda.</p>
      )}

      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Editar post</h3>
              <button
                onClick={() => setEditingPost(null)}
                className="text-sm text-[var(--muted)] hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              {editingPost.accounts?.persona_name ?? "Conta removida"}
            </p>

            <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)] bg-black">
              <video src={editingPost.video_url} controls className="max-h-56 w-full object-contain" />
            </div>

            <div className="mt-4 space-y-1">
              <label className="text-sm text-neutral-300">Legenda</label>
              <textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-white outline-none focus:border-sky-500"
              />
            </div>

            <div className="mt-4 space-y-1">
              <label className="text-sm text-neutral-300">Data e hora</label>
              <DateTimePicker value={editScheduledAt} onChange={setEditScheduledAt} />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditingPost(null)}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="nex-gradient-bg rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
