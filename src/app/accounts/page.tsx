"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RowSkeleton } from "@/components/skeleton";
import { useUi } from "@/components/ui-provider";

interface Account {
  id: string;
  persona_name: string;
  ig_username: string;
  token_expires_at: string;
  created_at: string;
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
      });
  }, []);

  useEffect(() => {
    if (error) showToast(`Falha ao conectar: ${detail || error}`, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveRename(id: string) {
    await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, persona_name: editValue }),
    });
    setEditingId(null);
    showToast("Nome atualizado.");
    load();
  }

  async function removeAccount(id: string) {
    const ok = await confirm("Desconectar esta conta do NexSocial?");
    if (!ok) return;
    await fetch(`/api/accounts?id=${id}`, { method: "DELETE" });
    showToast("Conta desconectada.");
    load();
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contas conectadas</h1>
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
        <p className="mt-6 rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-[var(--muted)]">
          Nenhuma conta conectada ainda. Clique em &quot;Conectar conta do Instagram&quot; para
          vincular sua primeira conta Business/Creator.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="nex-card flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div>
              {editingId === acc.id ? (
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm text-white"
                />
              ) : (
                <p className="font-medium">{acc.persona_name}</p>
              )}
              <p className="text-sm text-neutral-500">@{acc.ig_username}</p>
              <p className="text-xs text-neutral-600">
                token expira em {new Date(acc.token_expires_at).toLocaleDateString("pt-BR")}
              </p>
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
                <button
                  onClick={() => {
                    setEditingId(acc.id);
                    setEditValue(acc.persona_name);
                  }}
                  className="rounded-md border border-[var(--border)] px-3 py-1 text-sm hover:bg-[var(--surface-hover)]"
                >
                  Renomear
                </button>
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
    </AppShell>
  );
}
