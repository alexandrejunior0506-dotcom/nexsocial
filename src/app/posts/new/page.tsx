"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useUi } from "@/components/ui-provider";

interface Account {
  id: string;
  persona_name: string;
  ig_username: string;
}

const CAPTION_LIMIT = 2200;

export default function NewPostPage() {
  const router = useRouter();
  const { showToast } = useUi();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [caption, setCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.accounts || []);
        if (data.accounts?.[0]) setAccountId(data.accounts[0].id);
      });
  }, []);

  function pickFile(picked: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(picked);
    setPreviewUrl(picked ? URL.createObjectURL(picked) : null);
  }

  function uploadWithProgress(url: string, uploadFile: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", uploadFile.type || "video/mp4");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Falha ao enviar o vídeo")));
      xhr.onerror = () => reject(new Error("Falha ao enviar o vídeo"));
      xhr.send(uploadFile);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !accountId || !scheduledAt) return;

    setSubmitting(true);
    setProgress(0);
    try {
      setStatus("Preparando upload...");
      const uploadUrlRes = await fetch("/api/posts/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name }),
      });
      const { signedUrl, publicUrl, error: uploadUrlError } = await uploadUrlRes.json();
      if (uploadUrlError) throw new Error(uploadUrlError);

      setStatus("Enviando vídeo...");
      await uploadWithProgress(signedUrl, file);

      setStatus("Agendando post...");
      const createRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          video_url: publicUrl,
          caption,
          scheduled_at: new Date(scheduledAt).toISOString(),
        }),
      });
      const createData = await createRes.json();
      if (createData.error) throw new Error(createData.error);

      showToast("Post agendado com sucesso!");
      router.push("/calendar");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado";
      setStatus(null);
      showToast(message, "error");
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Novo post</h1>

      <form onSubmit={handleSubmit} className="mt-6 grid max-w-3xl gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-neutral-300">Conta</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-white"
            >
              <option value="" disabled>
                Selecione uma conta
              </option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.persona_name} (@{acc.ig_username})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm text-neutral-300">Legenda</label>
              <span
                className={`text-xs ${caption.length > CAPTION_LIMIT ? "text-red-400" : "text-[var(--muted)]"}`}
              >
                {caption.length}/{CAPTION_LIMIT}
              </span>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-white outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-neutral-300">Data e hora do agendamento</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-white outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Vídeo (Reels)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime"
            required
            onChange={(e) => pickFile(e.target.files?.[0] || null)}
            className="hidden"
          />

          {!previewUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0] || null);
              }}
              className={`flex aspect-[9/16] max-h-96 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                dragging
                  ? "border-sky-500 bg-sky-950/20"
                  : "border-[var(--border)] bg-[var(--surface)] hover:border-sky-500/50"
              }`}
            >
              <UploadIcon className="h-8 w-8 text-[var(--muted)]" />
              <p className="text-sm text-neutral-300">Arraste o vídeo aqui</p>
              <p className="text-xs text-[var(--muted)]">ou clique para escolher (MP4/MOV)</p>
            </div>
          ) : (
            <div className="relative aspect-[9/16] max-h-96 overflow-hidden rounded-xl border border-[var(--border)] bg-black">
              <video src={previewUrl} controls className="h-full w-full object-contain" />
              <button
                type="button"
                onClick={() => pickFile(null)}
                className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white hover:bg-black"
              >
                Trocar
              </button>
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          {submitting && (
            <div className="mb-3 space-y-1">
              <div className="flex justify-between text-xs text-[var(--muted)]">
                <span>{status}</span>
                {status === "Enviando vídeo..." && <span>{progress}%</span>}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
                <div
                  className="nex-gradient-bg h-full rounded-full transition-all duration-200"
                  style={{ width: `${status === "Enviando vídeo..." ? progress : status ? 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !file}
            className="nex-gradient-bg rounded-md px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Agendar post"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 16V4M12 4 7 9M12 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
