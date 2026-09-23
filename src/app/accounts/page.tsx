"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { RowSkeleton } from "@/components/skeleton";
import { useUi } from "@/components/ui-provider";

interface Account {
  id: string;
  persona_name: string;
  ig_username: string;
  token_expires_at: string;
  profile_picture_url: string | null;
  status: "active" | "error";
  last_checked_at: string | null;
  last_error: string | null;
  created_at: string;
  default_caption?: string | null;
}

const CAPTION_LIMIT = 2200;

function tokenExpiryInfo(expiresAt: string) {
  const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (daysLeft <= 0) return { label: "Token expirado", color: "text-red-400" };
  if (daysLeft <= 7) return { label: `Token expira em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}`, color: "text-red-400" };
  if (daysLeft <= 15) return { label: `Token expira em ${daysLeft} dias`, color: "text-yellow-400" };
  return { label: `Token expira em ${daysLeft} dias`, color: "text-neutral-600" };
}

export default function AccountsPage() {
  return (
    <Suspense fallback={null}>
      <AccountsContent />
    </Suspense>
  );
}

function AccountsContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const detail = searchParams.get("detail");
  const { showToast, confirm } = useUi();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [captionAccount, setCaptionAccount] = useState<Account | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);

  async function load() {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    setAccounts(data.accounts || []);
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.accounts || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        showToast("Falha ao carregar contas. Verifique sua conexão.", "error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (error) showToast(`Falha ao conectar: ${detail || error}`, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveRename(id: string) {
    const name = editValue.trim();
    if (!name) {
      showToast("O nome não pode ficar vazio.", "error");
      return;
    }
    try {
      const res = await fetch("/api/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, persona_name: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao atualizar o nome");
      setEditingId(null);
      showToast("Nome atualizado.");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Falha ao atualizar o nome", "error");
    }
  }

  async function removeAccount(id: string) {
    const ok = await confirm("Desconectar esta conta do NexSocial?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/accounts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao desconectar a conta");
      showToast("Conta desconectada.");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Falha ao desconectar a conta", "error");
    }
  }

  async function saveCaption(clear = false) {
    if (!captionAccount) return;
    setSavingCaption(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: captionAccount.id, default_caption: clear ? null : captionDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao salvar a legenda fixa");
      showToast(clear || !captionDraft.trim() ? "Legenda fixa removida." : "Legenda fixa salva.");
      setCaptionAccount(null);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Falha ao salvar a legenda fixa", "error");
    } finally {
      setSavingCaption(false);
    }
  }

  async function checkAccount(id: string) {
    setCheckingId(id);
    try {
      const res = await fetch(`/api/accounts/${id}/check`, { method: "POST" });
      const data = await res.json();
      if (data.error) {
        showToast(`Conta com problema: ${data.error}`, "error");
      } else {
        showToast("Conta ativa e funcionando normalmente.");
      }
      load();
    } finally {
      setCheckingId(null);
    }
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <span className="nex-eyebrow">Instagram</span>
          <h1 className="text-2xl font-semibold">Contas conectadas</h1>
        </div>
        <a
          href="/api/instagram/oauth"
          className="nex-gradient-bg rounded-md px-4 py-2 text-sm font-medium text-white"
        >
          Conectar conta do Instagram
        </a>
      </div>

      {loading && (
        <div className="mt-6 space-y-3">
          <RowSkeleton />
          <RowSkeleton />
        </div>
      )}

      {!loading && accounts.length === 0 && (
        <div className="mt-6">
          <EmptyState
            variant="accounts"
            title="Nenhuma conta conectada ainda"
            description='Clique em "Conectar conta do Instagram" para vincular sua primeira conta Business/Creator.'
          />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {accounts.map((acc, index) => (
          <div
            key={acc.id}
            style={{ animationDelay: `${index * 0.06}s` }}
            className="nex-card nex-rise-in flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] text-xs font-medium text-[var(--muted)]">
                {index + 1}
              </div>

              {acc.profile_picture_url ? (
                <Image
                  src={acc.profile_picture_url}
                  alt={acc.ig_username}
                  width={44}
                  height={44}
                  unoptimized
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="nex-gradient-bg flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white">
                  {acc.persona_name.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  {editingId === acc.id ? (
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm text-white"
                    />
                  ) : (
                    <p className="font-medium">{acc.persona_name}</p>
                  )}

                  {acc.status === "active" ? (
                    <span className="flex items-center gap-1 rounded-full bg-green-950/50 px-2 py-0.5 text-xs text-green-400">
                      <span className="nex-pulse-dot h-1.5 w-1.5 rounded-full bg-green-500" />
                      Ativa
                    </span>
                  ) : (
                    <span
                      title={acc.last_error ?? "Verifique a conta"}
                      className="flex items-center gap-1 rounded-full bg-red-950/50 px-2 py-0.5 text-xs text-red-400"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Verificar conta
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-500">@{acc.ig_username}</p>
                <p className={`text-xs ${tokenExpiryInfo(acc.token_expires_at).color}`}>
                  {tokenExpiryInfo(acc.token_expires_at).label} ({new Date(acc.token_expires_at).toLocaleDateString("pt-BR")})
                </p>
                {acc.default_caption && (
                  <p className="mt-1 max-w-sm truncate text-xs text-[var(--muted)]" title={acc.default_caption}>
                    📝 Legenda fixa: {acc.default_caption.replace(/\s+/g, " ")}
                  </p>
                )}
                {acc.status === "error" && acc.last_error && (
                  <p className="mt-1 max-w-xs text-xs text-red-400">{acc.last_error}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {editingId === acc.id ? (
                <button
                  onClick={() => saveRename(acc.id)}
                  className="nex-gradient-bg rounded-md px-3 py-1 text-sm text-white"
                >
                  Salvar
                </button>
              ) : (
                <>
                  <button
                    onClick={() => checkAccount(acc.id)}
                    disabled={checkingId === acc.id}
                    className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--surface-hover)] disabled:opacity-50"
                  >
                    {checkingId === acc.id ? "Verificando..." : "Verificar agora"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(acc.id);
                      setEditValue(acc.persona_name);
                    }}
                    className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--surface-hover)]"
                  >
                    Renomear
                  </button>
                  <button
                    onClick={() => {
                      setCaptionAccount(acc);
                      setCaptionDraft(acc.default_caption ?? "");
                    }}
                    className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--surface-hover)]"
                  >
                    Legenda fixa
                  </button>
                </>
              )}
              <button
                onClick={() => removeAccount(acc.id)}
                className="rounded-md border border-red-900/60 px-3 py-1 text-sm text-red-400 hover:bg-red-950/40"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
      {captionAccount && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 animate-fade-in">
          <div className="mx-auto my-8 w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Legenda fixa · {captionAccount.persona_name}</h3>
              <button onClick={() => setCaptionAccount(null)} className="text-sm text-[var(--muted)] hover:text-white">
                Fechar
              </button>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Essa legenda vem preenchida sozinha ao agendar vídeos dessa conta (você ainda pode editar na hora).
            </p>
            <div className="mt-4 flex items-center justify-between">
              <label className="text-sm text-neutral-300">Legenda</label>
              <span className={`text-xs ${captionDraft.length > CAPTION_LIMIT ? "text-red-400" : "text-[var(--muted)]"}`}>
                {captionDraft.length}/{CAPTION_LIMIT}
              </span>
            </div>
            <textarea
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              rows={9}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-white outline-none focus:border-sky-500"
            />
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                onClick={() => saveCaption(true)}
                disabled={savingCaption || !captionAccount.default_caption}
                className="rounded-md border border-red-900/60 px-4 py-2 text-sm text-red-400 hover:bg-red-950/40 disabled:opacity-40"
              >
                Remover legenda fixa
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setCaptionAccount(null)}
                  className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--surface-hover)]"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => saveCaption()}
                  disabled={savingCaption || captionDraft.length > CAPTION_LIMIT}
                  className="nex-gradient-bg rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {savingCaption ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
