"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useUi } from "@/components/ui-provider";

interface Account {
  id: string;
  persona_name: string;
  ig_username: string;
  profile_picture_url: string | null;
}

interface PostForDefaults {
  account_id: string;
  caption: string;
  cover_url: string | null;
  scheduled_at: string;
}

const CAPTION_LIMIT = 2200;
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const MAX_COVER_BYTES = 8 * 1024 * 1024;
const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png"];

export default function BulkPostPage() {
  const router = useRouter();
  const { showToast } = useUi();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [caption, setCaption] = useState("");
  const [suggestedCaption, setSuggestedCaption] = useState<string | null>(null);
  const captionTouchedRef = useRef(false);
  const [videos, setVideos] = useState<File[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [postsPerDay, setPostsPerDay] = useState(3);
  const [startDate, setStartDate] = useState("");
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.accounts || []);
        if (data.accounts?.[0]) setAccountId(data.accounts[0].id);
      })
      .catch(() => showToast("Falha ao carregar contas. Verifique sua conexão.", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverPreviewUrl]);

  useEffect(() => {
    captionTouchedRef.current = false;
    setSuggestedCaption(null);
    setExistingCoverUrl(null);
    setCoverRemoved(false);
    pickCover(null);
    if (!accountId) return;
    fetch("/api/posts")
      .then((res) => res.json())
      .then((data) => {
        const posts = (data.posts ?? []) as PostForDefaults[];
        const ownPosts = posts
          .filter((p) => p.account_id === accountId)
          .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

        const withCaption = ownPosts.find((p) => p.caption);
        if (withCaption) {
          setSuggestedCaption(withCaption.caption);
          if (!captionTouchedRef.current) setCaption(withCaption.caption);
        } else if (!captionTouchedRef.current) {
          setCaption("");
        }

        const withCover = ownPosts.find((p) => p.cover_url);
        if (withCover) setExistingCoverUrl(withCover.cover_url);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  useEffect(() => {
    if (!submitting) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [submitting]);

  const selectedAccount = accounts.find((a) => a.id === accountId);

  function addVideos(fileList: FileList | File[] | null) {
    if (!fileList) return;
    const picked = Array.from(fileList);
    const valid: File[] = [];
    for (const f of picked) {
      if (!ALLOWED_VIDEO_TYPES.includes(f.type)) {
        showToast(`"${f.name}" não é MP4/MOV e foi ignorado.`, "error");
        continue;
      }
      if (f.size > MAX_VIDEO_BYTES) {
        showToast(`"${f.name}" passa de 500MB e foi ignorado.`, "error");
        continue;
      }
      valid.push(f);
    }
    if (valid.length) setVideos((prev) => [...prev, ...valid]);
  }

  function removeVideo(index: number) {
    setVideos((prev) => prev.filter((_, i) => i !== index));
  }

  function pickCover(picked: File | null) {
    if (picked) {
      if (!ALLOWED_COVER_TYPES.includes(picked.type)) {
        showToast("Formato inválido. Envie uma imagem JPG ou PNG.", "error");
        return;
      }
      if (picked.size > MAX_COVER_BYTES) {
        showToast("Imagem muito grande. O limite é 8MB.", "error");
        return;
      }
    }
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    setCoverFile(picked);
    setCoverPreviewUrl(picked ? URL.createObjectURL(picked) : null);
    if (picked) setCoverRemoved(false);
  }

  async function uploadFile(uploadFile: File): Promise<string> {
    const uploadUrlRes = await fetch("/api/posts/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: uploadFile.name }),
    });
    const { signedUrl, publicUrl, error } = await uploadUrlRes.json();
    if (!uploadUrlRes.ok || error) throw new Error(error || "Falha ao preparar o upload");
    await uploadWithProgress(signedUrl, uploadFile);
    return publicUrl;
  }

  function uploadWithProgress(url: string, uploadFile: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", uploadFile.type || "video/mp4");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Falha ao enviar ${uploadFile.name}`)));
      xhr.onerror = () => reject(new Error(`Falha ao enviar ${uploadFile.name}`));
      xhr.send(uploadFile);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId) {
      showToast("Selecione uma conta.", "error");
      return;
    }
    if (videos.length === 0) {
      showToast("Escolha pelo menos um vídeo.", "error");
      return;
    }

    setSubmitting(true);
    setProgress(0);
    try {
      let coverUrl: string | null = null;
      if (coverFile) {
        setStatus("Enviando capa...");
        setProgress(0);
        coverUrl = await uploadFile(coverFile);
      } else if (existingCoverUrl && !coverRemoved) {
        coverUrl = existingCoverUrl;
      }

      const videoUrls: string[] = [];
      for (let i = 0; i < videos.length; i++) {
        setStatus(`Enviando vídeo ${i + 1} de ${videos.length}...`);
        setProgress(0);
        const url = await uploadFile(videos[i]);
        videoUrls.push(url);
      }

      setStatus("Agendando vídeos...");
      const res = await fetch("/api/posts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          caption,
          cover_url: coverUrl,
          video_urls: videoUrls,
          posts_per_day: postsPerDay,
          start_date: startDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Falha ao agendar os vídeos");

      const startLabel = data.startDate ? new Date(`${data.startDate}T12:00:00`).toLocaleDateString("pt-BR") : "";
      const endLabel = data.endDate ? new Date(`${data.endDate}T12:00:00`).toLocaleDateString("pt-BR") : "";
      showToast(
        `${videoUrls.length} vídeos agendados${startLabel ? `, de ${startLabel} até ${endLabel}` : ""}!`,
      );
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
      <h1 className="text-2xl font-semibold">Agendar em lote</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Escolha uma conta, suba vários vídeos de uma vez com uma legenda e uma capa únicas — o sistema
        distribui as datas e horários sozinho, sem repetir horário com nenhum outro vídeo já agendado.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-4">
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
          <label className="text-sm text-neutral-300">Vídeos (Reels)</label>
          <input
            ref={videoInputRef}
            type="file"
            multiple
            onChange={(e) => {
              addVideos(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
          />
          <div
            onClick={() => videoInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addVideos(e.dataTransfer.files);
            }}
            className={`flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center transition-colors ${
              dragging
                ? "border-sky-500 bg-sky-950/20"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-sky-500/50"
            }`}
          >
            <UploadIcon className="h-6 w-6 text-[var(--muted)]" />
            <p className="text-sm text-neutral-300">Arraste vários vídeos aqui ou clique</p>
            <p className="text-xs text-[var(--muted)]">MP4 ou MOV, pode selecionar vários de uma vez</p>
          </div>

          {videos.length > 0 && (
            <div className="mt-2 space-y-1">
              {videos.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm"
                >
                  <span className="truncate text-neutral-300">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeVideo(i)}
                    className="ml-2 shrink-0 text-[var(--muted)] hover:text-red-400"
                  >
                    Remover
                  </button>
                </div>
              ))}
              <p className="text-xs text-[var(--muted)]">{videos.length} vídeo(s) selecionado(s)</p>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Capa (aplicada em todos os vídeos deste lote)</label>
          <input
            ref={coverInputRef}
            type="file"
            onChange={(e) => pickCover(e.target.files?.[0] || null)}
            className="hidden"
          />
          {(() => {
            const activeCoverPreview = coverPreviewUrl || (!coverRemoved ? existingCoverUrl : null);
            return (
              <div className="flex items-center gap-3">
                {activeCoverPreview && (
                  <Image
                    src={activeCoverPreview}
                    alt="Capa"
                    width={48}
                    height={48}
                    unoptimized
                    className="h-12 w-12 shrink-0 rounded-md border border-[var(--border)] object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="rounded-md border border-[var(--border)] px-3 py-2 text-sm text-neutral-300 hover:bg-[var(--surface-hover)]"
                >
                  {activeCoverPreview ? "Trocar capa" : "Escolher imagem de capa"}
                </button>
                {activeCoverPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      pickCover(null);
                      setCoverRemoved(true);
                    }}
                    className="text-sm text-[var(--muted)] hover:text-white"
                  >
                    Remover
                  </button>
                )}
              </div>
            );
          })()}
          {!coverFile && existingCoverUrl && !coverRemoved && (
            <p className="text-xs text-[var(--muted)]">Capa salva dessa conta, reaproveitada automaticamente.</p>
          )}
          <p className="text-xs text-[var(--muted)]">JPG ou PNG. Se não escolher, o Instagram usa um frame do vídeo.</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm text-neutral-300">Legenda (aplicada em todos os vídeos deste lote)</label>
            <span className={`text-xs ${caption.length > CAPTION_LIMIT ? "text-red-400" : "text-[var(--muted)]"}`}>
              {caption.length}/{CAPTION_LIMIT}
            </span>
          </div>
          <textarea
            value={caption}
            onChange={(e) => {
              setCaption(e.target.value);
              captionTouchedRef.current = true;
            }}
            rows={5}
            placeholder="Pode deixar em branco se não quiser legenda"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-white outline-none focus:border-sky-500"
          />
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => {
                setCaption("");
                captionTouchedRef.current = true;
              }}
              className="text-[var(--muted)] hover:text-white"
            >
              Deixar em branco
            </button>
            {suggestedCaption && caption !== suggestedCaption && (
              <button
                type="button"
                onClick={() => {
                  setCaption(suggestedCaption);
                  captionTouchedRef.current = true;
                }}
                className="text-sky-400 hover:text-sky-300"
              >
                Usar a última legenda dessa conta
              </button>
            )}
          </div>
          {suggestedCaption && caption === suggestedCaption && (
            <p className="text-xs text-[var(--muted)]">
              Preenchido automaticamente com a última legenda usada nessa conta — edite à vontade.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Vídeos por dia</label>
          <input
            type="number"
            min={1}
            max={10}
            value={postsPerDay}
            onChange={(e) => setPostsPerDay(Number(e.target.value))}
            className="w-24 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-white outline-none focus:border-sky-500"
          />
          <p className="text-xs text-[var(--muted)]">
            {startDate
              ? "Data de início escolhida abaixo — os horários dentro de cada dia continuam automáticos."
              : "O agendamento começa no primeiro dia livre depois do último post já agendado dessa conta."}
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Data de início (opcional)</label>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={startDate}
              min={new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-white outline-none focus:border-sky-500"
            />
            {startDate && (
              <button
                type="button"
                onClick={() => setStartDate("")}
                className="text-sm text-[var(--muted)] hover:text-white"
              >
                Limpar (voltar ao automático)
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--muted)]">
            Deixe em branco para o sistema escolher sozinho. Os horários dentro de cada dia continuam
            automáticos mesmo escolhendo a data.
          </p>
        </div>

        {submitting && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[var(--muted)]">
              <span>{status}</span>
              {status?.startsWith("Enviando") && <span>{progress}%</span>}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
              <div
                className="nex-gradient-bg h-full rounded-full transition-all duration-200"
                style={{ width: `${status?.startsWith("Enviando") ? progress : status ? 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || videos.length === 0}
          className="nex-gradient-bg rounded-md px-6 py-2 font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Enviando..." : `Agendar ${videos.length || ""} vídeo(s)`}
        </button>
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
