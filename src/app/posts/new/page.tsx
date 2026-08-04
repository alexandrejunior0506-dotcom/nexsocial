"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DateTimePicker } from "@/components/date-time-picker";
import { useUi } from "@/components/ui-provider";

interface Account {
  id: string;
  persona_name: string;
  ig_username: string;
  profile_picture_url: string | null;
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

  const selectedAccount = accounts.find((a) => a.id === accountId);

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

      <form onSubmit={handleSubmit} className="mt-6 grid max-w-4xl gap-8 md:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-neutral-300">Conta</label>
            <div className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
              {selectedAccount?.profile_picture_url ? (
                <Image
                  src={selectedAccount.profile_picture_url}
                  alt={selectedAccount.ig_username}
                  width={28}
                  height={28}
                  unoptimized
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="nex-gradient-bg flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                  {selectedAccount?.persona_name.charAt(0).toUpperCase() ?? "?"}
                </div>
              )}
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full bg-transparent text-white outline-none"
              >
                <option value="" disabled>
                  Selecione uma conta
                </option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-[var(--surface)]">
                    {acc.persona_name} (@{acc.ig_username})
                  </option>
                ))}
              </select>
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
                className={`flex h-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center transition-colors ${
                  dragging
                    ? "border-sky-500 bg-sky-950/20"
                    : "border-[var(--border)] bg-[var(--surface)] hover:border-sky-500/50"
                }`}
              >
                <UploadIcon className="h-6 w-6 text-[var(--muted)]" />
                <p className="text-sm text-neutral-300">Arraste o vídeo aqui ou clique</p>
                <p className="text-xs text-[var(--muted)]">MP4 ou MOV</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => pickFile(null)}
                className="rounded-md border border-[var(--border)] px-3 py-2 text-sm text-neutral-300 hover:bg-[var(--surface-hover)]"
              >
                Trocar vídeo
              </button>
            )}
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
              rows={5}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-white outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-neutral-300">Data e hora do agendamento</label>
            <DateTimePicker value={scheduledAt} onChange={setScheduledAt} />
          </div>

          {submitting && (
            <div className="space-y-1">
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
            className="nex-gradient-bg rounded-md px-6 py-2 font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Agendar post"}
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-[var(--muted)]">Prévia</span>
          <PhonePreview
            previewUrl={previewUrl}
            caption={caption}
            username={selectedAccount?.ig_username ?? "sua_conta"}
            avatarUrl={selectedAccount?.profile_picture_url ?? null}
            personaInitial={selectedAccount?.persona_name.charAt(0).toUpperCase() ?? "?"}
          />
        </div>
      </form>
    </AppShell>
  );
}

function PhonePreview({
  previewUrl,
  caption,
  username,
  avatarUrl,
  personaInitial,
}: {
  previewUrl: string | null;
  caption: string;
  username: string;
  avatarUrl: string | null;
  personaInitial: string;
}) {
  return (
    <div className="relative h-[520px] w-[260px] shrink-0 overflow-hidden rounded-[2.25rem] border-[6px] border-neutral-800 bg-black shadow-2xl">
      <div className="absolute left-1/2 top-0 z-20 h-4 w-24 -translate-x-1/2 rounded-b-xl bg-neutral-800" />

      {previewUrl ? (
        <video src={previewUrl} className="h-full w-full object-cover" muted loop autoPlay playsInline />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--surface)] text-center">
          <UploadIcon className="h-8 w-8 text-[var(--muted)]" />
          <p className="px-6 text-xs text-[var(--muted)]">O vídeo aparece aqui assim que você escolher</p>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10">
        <div className="flex items-center gap-2">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={username} width={24} height={24} unoptimized className="h-6 w-6 rounded-full object-cover ring-1 ring-white/50" />
          ) : (
            <div className="nex-gradient-bg flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-1 ring-white/50">
              {personaInitial}
            </div>
          )}
          <span className="text-xs font-semibold text-white">@{username}</span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs text-neutral-200">{caption || "Sua legenda aparece aqui..."}</p>
      </div>

      <div className="absolute bottom-16 right-2 z-10 flex flex-col items-center gap-3 text-white">
        <HeartIcon className="h-5 w-5" />
        <CommentIcon className="h-5 w-5" />
        <ShareIcon className="h-5 w-5" />
      </div>
    </div>
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

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 21s-6.7-4.35-9.3-8.1C1 10.2 1.7 6.9 4.6 5.5c2.1-1 4.4-.3 5.9 1.4l1.5 1.7 1.5-1.7c1.5-1.7 3.8-2.4 5.9-1.4 2.9 1.4 3.6 4.7 1.9 7.4C18.7 16.65 12 21 12 21z" />
    </svg>
  );
}

function CommentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.6 3.4 6.1-.1.9-.5 2.2-1.3 3.4 1.6-.2 3.2-.9 4.4-1.8 1.1.3 2.3.4 3.5.4 5.5 0 10-3.6 10-8S17.5 3 12 3z" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m3 12 18-8-8 18-2-8-8-2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
