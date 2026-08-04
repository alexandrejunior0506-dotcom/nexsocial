"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";

interface Account {
  id: string;
  persona_name: string;
  ig_username: string;
}

export default function NewPostPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [caption, setCaption] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.accounts || []);
        if (data.accounts?.[0]) setAccountId(data.accounts[0].id);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !accountId || !scheduledAt) return;

    setSubmitting(true);
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
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "video/mp4" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Falha ao enviar o vídeo para o Storage");

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

      router.push("/calendar");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro inesperado");
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Novo post</h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4">
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
          <label className="text-sm text-neutral-300">Vídeo (Reels)</label>
          <input
            type="file"
            accept="video/mp4,video/quicktime"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-neutral-300"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Legenda</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-white"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-neutral-300">Data e hora do agendamento</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-white"
          />
        </div>

        {status && <p className="text-sm text-neutral-400">{status}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="nex-gradient-bg rounded-md px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Enviando..." : "Agendar post"}
        </button>
      </form>
    </AppShell>
  );
}
