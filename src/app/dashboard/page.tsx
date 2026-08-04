import Image from "next/image";
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

interface PostAnalyticsRow {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  fetched_at: string;
}

interface AccountRef {
  id: string;
  persona_name: string;
  ig_username: string;
  profile_picture_url: string | null;
}

export default async function DashboardPage() {
  const supabase = createServiceClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ data: accounts }, { data: upcoming }, { count: publishedThisMonth }, { data: publishedPosts }] =
    await Promise.all([
      supabase.from("accounts").select("id, persona_name, ig_username, profile_picture_url"),
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
      supabase
        .from("posts")
        .select("account_id, post_analytics(likes, comments, shares, saves, fetched_at)")
        .eq("status", "published")
        .order("fetched_at", { referencedTable: "post_analytics", ascending: false }),
    ]);

  const engagementByAccount = new Map<string, number>();
  for (const post of publishedPosts ?? []) {
    const latest = (post.post_analytics as unknown as PostAnalyticsRow[] | null)?.[0];
    if (!latest) continue;
    const score = (latest.likes ?? 0) + (latest.comments ?? 0) + (latest.shares ?? 0) + (latest.saves ?? 0);
    engagementByAccount.set(post.account_id, (engagementByAccount.get(post.account_id) ?? 0) + score);
  }

  const topAccounts = ((accounts ?? []) as AccountRef[])
    .map((acc) => ({ ...acc, engagement: engagementByAccount.get(acc.id) ?? 0 }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5);

  const maxEngagement = Math.max(1, ...topAccounts.map((a) => a.engagement));
  const hasEngagementData = topAccounts.some((a) => a.engagement > 0);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <StatCard
          delay={0}
          label="Contas conectadas"
          value={accounts?.length ?? 0}
          href="/accounts"
          cta="Gerenciar contas"
          icon={<UsersIcon className="h-5 w-5" />}
        />
        <StatCard
          delay={0.05}
          label="Próximos agendamentos"
          value={upcoming?.length ?? 0}
          href="/calendar"
          cta="Ver calendário"
          icon={<CalendarIcon className="h-5 w-5" />}
        />
        <StatCard
          delay={0.1}
          label="Publicados este mês"
          value={publishedThisMonth ?? 0}
          href="/analytics"
          cta="Ver analytics"
          icon={<ChartIcon className="h-5 w-5" />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Próximos agendamentos</h2>
            <Link
              href="/posts/new"
              className="nex-gradient-bg rounded-md px-3 py-1.5 text-sm font-medium text-white"
            >
              + Novo post
            </Link>
          </div>

          <div className="mt-3 space-y-2">
            {(upcoming ?? []).length === 0 && (
              <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-[var(--muted)]">
                Nada agendado. Crie um novo post.
              </p>
            )}
            {(upcoming ?? []).map((post, i) => (
              <div
                key={post.id}
                style={{ animationDelay: `${i * 0.05}s` }}
                className="nex-card nex-rise-in flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[post.status] ?? "bg-neutral-500"}`}
                  />
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
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-lg font-medium">Top contas por engajamento</h2>
          <div className="mt-3 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            {topAccounts.length === 0 && (
              <p className="text-sm text-[var(--muted)]">Conecte uma conta para ver o ranking.</p>
            )}
            {!hasEngagementData && topAccounts.length > 0 && (
              <p className="text-sm text-[var(--muted)]">
                Ainda sem dados de engajamento. Aparecem aqui depois que os posts publicados forem
                sincronizados.
              </p>
            )}
            {topAccounts.map((acc, i) => (
              <div
                key={acc.id}
                style={{ animationDelay: `${i * 0.06}s` }}
                className="nex-rise-in flex items-center gap-3"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0
                      ? "bg-yellow-500 text-black"
                      : i === 1
                        ? "bg-neutral-300 text-black"
                        : i === 2
                          ? "bg-amber-700 text-white"
                          : "bg-[var(--surface-hover)] text-[var(--muted)]"
                  }`}
                >
                  {i + 1}
                </span>

                {acc.profile_picture_url ? (
                  <Image
                    src={acc.profile_picture_url}
                    alt={acc.ig_username}
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="nex-gradient-bg flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                    {acc.persona_name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{acc.persona_name}</p>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
                    <div
                      className="nex-gradient-bg h-full rounded-full"
                      style={{ width: `${Math.max(4, (acc.engagement / maxEngagement) * 100)}%` }}
                    />
                  </div>
                </div>

                <span className="shrink-0 text-sm text-[var(--muted)]">{acc.engagement}</span>
              </div>
            ))}
          </div>
        </div>
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
  delay,
}: {
  label: string;
  value: number;
  href: string;
  cta: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <div
      style={{ animationDelay: `${delay}s` }}
      className="nex-card nex-rise-in rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
    >
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
