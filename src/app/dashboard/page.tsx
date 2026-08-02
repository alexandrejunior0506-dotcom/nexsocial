import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServiceClient();

  const [{ data: accounts }, { data: upcoming }] = await Promise.all([
    supabase.from("accounts").select("id, persona_name, ig_username"),
    supabase
      .from("posts")
      .select("id, caption, scheduled_at, status, accounts(persona_name)")
      .in("status", ["scheduled", "processing"])
      .order("scheduled_at", { ascending: true })
      .limit(5),
  ]);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Contas conectadas</p>
          <p className="mt-1 text-3xl font-semibold">{accounts?.length ?? 0}</p>
          <Link href="/accounts" className="mt-2 inline-block text-sm text-neutral-400 underline">
            Gerenciar contas
          </Link>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Próximos posts agendados</p>
          <p className="mt-1 text-3xl font-semibold">{upcoming?.length ?? 0}</p>
          <Link href="/calendar" className="mt-2 inline-block text-sm text-neutral-400 underline">
            Ver calendário
          </Link>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-medium">Próximos agendamentos</h2>
      <div className="mt-3 space-y-2">
        {(upcoming ?? []).length === 0 && (
          <p className="text-neutral-400">Nada agendado. Crie um novo post.</p>
        )}
        {(upcoming ?? []).map((post) => (
          <div
            key={post.id}
            className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-4"
          >
            <div>
              <p className="font-medium">
                {(post.accounts as unknown as { persona_name: string } | null)?.persona_name}
              </p>
              <p className="line-clamp-1 text-sm text-neutral-400">{post.caption}</p>
            </div>
            <p className="text-sm text-neutral-500">
              {new Date(post.scheduled_at).toLocaleString("pt-BR")}
            </p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
