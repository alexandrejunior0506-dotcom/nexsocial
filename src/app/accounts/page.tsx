"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";

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

  async function saveRename(id: string) {
    await fetch("/api/accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, persona_name: editValue }),
    });
    setEditingId(null);
    load();
  }

  async function removeAccount(id: string) {
    if (!confirm("Desconectar esta conta do NexSocial?")) return;
    await fetch(`/api/accounts?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contas conectadas</h1>
        <a
          href="/api/instagram/oauth"
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black"
        >
          Conectar conta do Instagram
        </a>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
          <p className="font-medium">Falha ao conectar: {error}</p>
          {detail && <p className="mt-1 text-red-400">{detail}</p>}
        </div>
      )}

      {loading && <p className="mt-6 text-neutral-400">Carregando...</p>}

      {!loading && accounts.length === 0 && (
        <p className="mt-6 text-neutral-400">
          Nenhuma conta conectada ainda. Clique em &quot;Conectar conta do Instagram&quot; para
          vincular sua primeira conta Business/Creator.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4"
          >
            <div>
              {editingId === acc.id ? (
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-white"
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
                  className="rounded-md bg-white px-3 py-1 text-sm text-black"
                >
                  Salvar
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingId(acc.id);
                    setEditValue(acc.persona_name);
                  }}
                  className="rounded-md border border-neutral-700 px-3 py-1 text-sm"
                >
                  Renomear
                </button>
              )}
              <button
                onClick={() => removeAccount(acc.id)}
                className="rounded-md border border-red-900 px-3 py-1 text-sm text-red-400"
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
