import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-sky-500",
  processing: "bg-yellow-500",
  published: "bg-green-500",
  failed: "bg-red-500",
};

export default async function DashboardPage() {
  const supabase = createServiceClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ data: accounts }, { data: upcoming }, { count: publishedThisMonth }] = await Promise.all([
    supabase.from("accounts").select("id, persona_name, ig_username"),
    supabase
      .from("posts")
      .select("id, caption, scheduled_at, status, accounts(persona_name)")
      .in("status", ["scheduled", "processing"])
      .order("scheduled_at", { ascending: true })
      .limit(6),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("published_at", startOfMonth.toISOString()),
  ]);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard
          label="Contas conectadas"
          value={accounts?.length ?? 0}
          href="/accounts"
          cta="Gerenciar contas"
          icon={<UsersIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Próximos agendamentos"
          value={upcoming?.length ?? 0}
          href="/calendar"
          cta="Ver calendário"
          icon={<CalendarIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Publicados este mês"
          value={publishedThisMonth ?? 0}
          href="/analytics"
          cta="Ver analytics"
          icon={<ChartIcon className="h-5 w-5" />}
        />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-medium">Próximos agendamentos</h2>
        <Link href="/posts/new" className="nex-gradient-bg rounded-md px-3 py-1.5 text-sm font-medium text-white">
          + Novo post
        </Link>
      </div>

      <div className="mt-3 space-y-2">
        {(upcoming ?? []).length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-[var(--muted)]">
            Nada agendado. Crie um novo post.
          </p>
        )}
        {(upcoming ?? []).map((post) => (
          <div
            key={post.id}
            className="nex-card flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-center gap-3">
              <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[post.status] ?? "bg-neutral-500"}`} />
              <div>
                <p className="font-medium">
                  {(post.accounts as unknown as { persona_name: string } | null)?.persona_name}
                </p>
                <p className="line-clamp-1 text-sm text-neutral-400">{post.caption || "Sem legenda"}</p>
              </div>
            </div>
            <p className="shrink-0 text-sm text-neutral-500">
              {new Date(post.scheduled_at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  href,
  cta,
  icon,
}: {
  label: string;
  value: number;
  href: string;
  cta: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="nex-card rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <span className="nex-gradient-text">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <Link href={href} className="mt-2 inline-block text-sm text-sky-400 hover:text-sky-300">
        {cta}
      </Link>
    </div>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 20c.3-2.4 1.6-4.3 3.5-5.2" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" />
      <path d="M3 20h18" strokeLinecap="round" />
    </svg>
  );
}
