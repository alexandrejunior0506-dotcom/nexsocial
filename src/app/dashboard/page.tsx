import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Flame,
  Film,
  Radio,
  Send,
  TriangleAlert,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CountUp } from "@/components/count-up";
import { EmptyState } from "@/components/empty-state";
import { Gauge } from "@/components/gauge";
import { NextRing } from "@/components/next-ring";
import { PageHeader } from "@/components/page-header";
import { Sparkline } from "@/components/sparkline";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";
const DAY = 24 * 60 * 60 * 1000;
const QUEUE_LIMIT = 300;

// Cores de destaque por conta — todas dentro da família azul da logo do Nex.
const ACCENTS = ["#17a9fe", "#4d8dff", "#22d3ee", "#7a8bff", "#38bdf8", "#5b9bff"];

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
  status: string;
}

const dayKey = (d: Date | number | string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(d));
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const ddmm = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" });

function relative(iso: string, now: number) {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60000);
  const text = m < 1 ? "agora" : m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${Math.floor(m / 1440)}d`;
  if (m < 1) return "agora";
  return diff >= 0 ? `em ${text}` : `há ${text}`;
}

export default async function DashboardPage() {
  const supabase = createServiceClient();
  const nowMs = new Date().getTime(); // página force-dynamic: roda a cada acesso
  // Esta página renderiza no servidor (UTC); limites de dia/mês e horários exibidos seguem Brasília.
  const todayStr = dayKey(nowMs);
  const dayStart = new Date(`${todayStr}T00:00:00-03:00`);
  const dayEnd = new Date(dayStart.getTime() + DAY);
  const startOfMonth = new Date(`${todayStr.slice(0, 8)}01T00:00:00-03:00`);
  const weekStart = new Date(dayStart.getTime() - 6 * DAY);

  const [
    { data: accounts },
    { data: queue },
    { count: publishedThisMonth },
    { data: publishedPosts },
    { count: upcomingTotal },
    { data: todayPosts },
    { count: failedTotal },
    { data: lastPublished },
    { data: weekPublished },
  ] = await Promise.all([
    supabase.from("accounts").select("id, persona_name, ig_username, profile_picture_url, status").order("created_at"),
    supabase
      .from("posts")
      .select("id, account_id, caption, scheduled_at, status, accounts(persona_name)")
      .in("status", ["scheduled", "processing"])
      .order("scheduled_at", { ascending: true })
      .limit(QUEUE_LIMIT),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("published_at", startOfMonth.toISOString()),
    supabase
      .from("posts")
      .select("account_id, post_analytics(likes, comments, shares, saves, fetched_at)")
      .eq("status", "published")
      .order("fetched_at", { referencedTable: "post_analytics", ascending: false })
      .limit(1, { referencedTable: "post_analytics" }),
    supabase.from("posts").select("id", { count: "exact", head: true }).in("status", ["scheduled", "processing"]),
    supabase
      .from("posts")
      .select("account_id, status")
      .gte("scheduled_at", dayStart.toISOString())
      .lt("scheduled_at", dayEnd.toISOString()),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase
      .from("posts")
      .select("id, account_id, published_at, accounts(persona_name)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(6),
    supabase
      .from("posts")
      .select("account_id, published_at")
      .eq("status", "published")
      .gte("published_at", weekStart.toISOString())
      .limit(3000),
  ]);

  const accountList = (accounts ?? []) as AccountRef[];

  // ── hoje, por conta ──
  const todayByAccount = new Map<string, { published: number; pending: number; failed: number }>();
  for (const post of todayPosts ?? []) {
    const row = todayByAccount.get(post.account_id) ?? { published: 0, pending: 0, failed: 0 };
    if (post.status === "published") row.published++;
    else if (post.status === "failed") row.failed++;
    else row.pending++;
    todayByAccount.set(post.account_id, row);
  }
  const todayTotals = [...todayByAccount.values()].reduce(
    (t, r) => ({ published: t.published + r.published, pending: t.pending + r.pending, failed: t.failed + r.failed }),
    { published: 0, pending: 0, failed: 0 },
  );
  const todayAll = todayTotals.published + todayTotals.pending + todayTotals.failed;
  const todayPct = todayAll ? (todayTotals.published / todayAll) * 100 : 0;

  // ── fila: próxima de cada conta e total por conta ──
  const queueList = queue ?? [];
  const nextByAccount = new Map<string, string>();
  const queuedByAccount = new Map<string, number>();
  for (const q of queueList) {
    queuedByAccount.set(q.account_id, (queuedByAccount.get(q.account_id) ?? 0) + 1);
    if (q.status === "scheduled" && !nextByAccount.has(q.account_id)) nextByAccount.set(q.account_id, q.scheduled_at);
  }
  const nextPost = queueList.find((q) => q.status === "scheduled") ?? null;
  const nextWho = (nextPost?.accounts as unknown as { persona_name: string } | null)?.persona_name ?? null;
  const upcoming = queueList.slice(0, 6);

  // ── 7 dias de publicações por conta (mini-gráfico) ──
  const keys = Array.from({ length: 7 }, (_, i) => dayKey(dayStart.getTime() + 12 * 60 * 60 * 1000 - (6 - i) * DAY));
  const weekByAccount = new Map<string, number[]>();
  for (const p of weekPublished ?? []) {
    if (!p.published_at) continue;
    const idx = keys.indexOf(dayKey(p.published_at));
    if (idx < 0) continue;
    const arr = weekByAccount.get(p.account_id) ?? Array(7).fill(0);
    arr[idx]++;
    weekByAccount.set(p.account_id, arr);
  }

  // ── engajamento ──
  const engagementByAccount = new Map<string, number>();
  for (const post of publishedPosts ?? []) {
    const latest = (post.post_analytics as unknown as PostAnalyticsRow[] | null)?.[0];
    if (!latest) continue;
    const score = (latest.likes ?? 0) + (latest.comments ?? 0) + (latest.shares ?? 0) + (latest.saves ?? 0);
    engagementByAccount.set(post.account_id, (engagementByAccount.get(post.account_id) ?? 0) + score);
  }
  const engagementTotal = [...engagementByAccount.values()].reduce((a, b) => a + b, 0);
  const topAccounts = accountList
    .map((acc) => ({ ...acc, engagement: engagementByAccount.get(acc.id) ?? 0 }))
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 5);
  const maxEngagement = Math.max(1, ...topAccounts.map((a) => a.engagement));
  const hasEngagementData = topAccounts.some((a) => a.engagement > 0);

  // ── saúde da operação ──
  const accountsWithError = accountList.filter((a) => a.status === "error").length;
  const health =
    (failedTotal ?? 0) > 0
      ? { tone: "bad", icon: TriangleAlert, title: `${failedTotal} publicação(ões) com falha`, sub: "Veja no calendário o que falhou" }
      : accountsWithError > 0
        ? { tone: "warn", icon: CircleAlert, title: `${accountsWithError} conta(s) pedindo atenção`, sub: "Abra Contas e use “Verificar agora”" }
        : !nextPost
          ? { tone: "mute", icon: Radio, title: "Fila vazia", sub: "Agende vídeos para o motor trabalhar" }
          : { tone: "ok", icon: CheckCircle2, title: "Operação saudável", sub: "Cron ativo · nenhuma falha registrada" };
  const healthTone = {
    ok: "border-[var(--ok)]/35 bg-[var(--ok)]/8 text-[var(--ok)]",
    warn: "border-[var(--warn)]/40 bg-[var(--warn)]/8 text-[var(--warn)]",
    bad: "border-[var(--bad)]/40 bg-[var(--bad)]/8 text-[var(--bad)]",
    mute: "border-[var(--line)] bg-white/[0.03] text-[var(--muted)]",
  }[health.tone as "ok" | "warn" | "bad" | "mute"];

  return (
    <AppShell>
      <PageHeader eyebrow="Visão geral" title="Painel" subtitle="O que está saindo agora, o que vem a seguir e como cada conta está indo." />

      {/* ───────── hero: contagem regressiva + resumo do dia ───────── */}
      <section className="nex-stagger grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="nex-panel p-5 sm:p-6">
          <div className={`relative flex items-center gap-3 rounded-[4px_14px_4px_14px] border px-4 py-3 ${healthTone}`}>
            <health.icon size={20} className="shrink-0" />
            <div className="min-w-0">
              <p className="nex-display text-[15px] font-semibold leading-tight text-[var(--foreground)]">{health.title}</p>
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{health.sub}</p>
            </div>
          </div>

          <div className="mt-6 grid items-center gap-6 sm:grid-cols-[236px_1fr]">
            <NextRing targetIso={nextPost?.scheduled_at ?? null} startIso={lastPublished?.[0]?.published_at ?? null} who={nextWho} />

            <div className="flex flex-col items-center gap-5">
              <Gauge value={todayPct} label="do dia publicado" size={210} />
              <div className="grid w-full grid-cols-3 gap-2.5">
                <MiniStat icon={Send} label="Publicados hoje" value={todayTotals.published} tone="text-[var(--ok)]" />
                <MiniStat icon={CalendarClock} label="Ainda hoje" value={todayTotals.pending} tone="text-[var(--accent-solid)]" />
                <MiniStat
                  icon={TriangleAlert}
                  label="Falhas (total)"
                  value={failedTotal ?? 0}
                  tone={(failedTotal ?? 0) > 0 ? "text-[var(--bad)]" : "text-[var(--muted)]"}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard icon={Users} label="Contas conectadas" value={accountList.length} href="/accounts" cta="Gerenciar" />
          <StatCard icon={CalendarClock} label="Na fila" value={upcomingTotal ?? 0} href="/calendar" cta="Ver calendário" />
          <StatCard icon={Film} label="Publicados no mês" value={publishedThisMonth ?? 0} href="/analytics" cta="Ver analytics" />
          <StatCard icon={Flame} label="Engajamento total" value={engagementTotal} href="/analytics" cta="Por vídeo" />
        </div>
      </section>

      {/* ───────── contas hoje ───────── */}
      <section className="mt-10">
        <SectionTitle eyebrow="Agora" title="Contas hoje" right={`${accountList.length} perfis`} />
        {accountList.length === 0 ? (
          <EmptyState variant="accounts" title="Nenhuma conta conectada" description="Conecte um perfil do Instagram para começar." actionHref="/accounts" actionLabel="Conectar conta" />
        ) : (
          <div className="nex-stagger grid grid-cols-[repeat(auto-fill,minmax(264px,1fr))] gap-4">
            {accountList.map((acc, i) => {
              const row = todayByAccount.get(acc.id) ?? { published: 0, pending: 0, failed: 0 };
              const total = row.published + row.pending + row.failed;
              const next = nextByAccount.get(acc.id);
              const queued = queuedByAccount.get(acc.id) ?? 0;
              const accent = ACCENTS[i % ACCENTS.length];
              const off = acc.status === "error";
              return (
                <Link
                  key={acc.id}
                  href="/analytics"
                  className="nex-frame"
                  style={{ "--accent": accent } as CSSProperties}
                >
                  <div className={`nex-frame-in grid gap-4 p-4 ${off ? "saturate-50" : ""}`}>
                    <div className="relative flex items-center gap-3.5">
                      <div className="relative h-[52px] w-[52px] shrink-0" style={{ "--accent": accent } as CSSProperties}>
                        <span className="nex-orb" />
                        {acc.profile_picture_url ? (
                          <Image
                            src={acc.profile_picture_url}
                            alt={acc.ig_username}
                            width={52}
                            height={52}
                            unoptimized
                            className="h-full w-full rounded-full border border-[var(--line-strong)] object-cover"
                          />
                        ) : (
                          <span className="nex-gradient-bg flex h-full w-full items-center justify-center rounded-full text-lg font-bold text-white">
                            {acc.persona_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="nex-display truncate text-[16px] font-semibold leading-tight">{acc.persona_name}</p>
                        <p className="nex-mono mt-0.5 truncate text-[11.5px] text-[var(--muted)]">@{acc.ig_username}</p>
                      </div>
                      <span
                        className={`nex-mono ml-auto shrink-0 rounded-[3px_8px_3px_8px] border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                          off ? "border-[var(--bad)]/45 text-[var(--bad)]" : "border-[var(--ok)]/40 text-[var(--ok)]"
                        }`}
                      >
                        {off ? "atenção" : "ativa"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-left">
                      <Metric label="Hoje" value={total ? `${row.published}/${total}` : "—"} />
                      <Metric label="Na fila" value={queued >= QUEUE_LIMIT ? `${QUEUE_LIMIT}+` : String(queued)} />
                      <Metric label="Engaj." value={(engagementByAccount.get(acc.id) ?? 0).toLocaleString("pt-BR")} />
                    </div>

                    <div className="nex-bar">
                      <i style={{ width: `${total ? (row.published / total) * 100 : 0}%` }} />
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div
                        className="min-w-0 border-l-2 bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-2.5 py-1.5"
                        style={{ borderColor: accent }}
                      >
                        <p className="nex-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">Próxima</p>
                        <p className="nex-mono text-[14px] font-semibold leading-tight">
                          {next ? hhmm(next) : "—"}
                          {next && <span className="ml-1.5 text-[10.5px] font-normal text-[var(--muted)]">{relative(next, nowMs)}</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <Sparkline values={weekByAccount.get(acc.id) ?? Array(7).fill(0)} color={accent} width={104} height={32} />
                        <p className="nex-mono mt-0.5 text-[9px] uppercase tracking-[0.14em] text-[var(--faint)]">7 dias</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ───────── fila + ranking ───────── */}
      <section className="mt-10 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SectionTitle
            eyebrow="Fila"
            title="Próximos agendamentos"
            action={
              <Link href="/posts/new" className="nex-gradient-bg rounded-xl px-3.5 py-2 text-[13px] font-semibold text-white">
                + Novo post
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState
              variant="calendar"
              title="Nada agendado"
              description="Agende um post ou suba vários de uma vez pelo agendamento em lote."
              actionHref="/posts/bulk"
              actionLabel="Agendar em lote"
              compact
            />
          ) : (
            <ol className="relative grid gap-3 pl-7">
              <span className="absolute bottom-2 left-[9px] top-2 w-0.5 rounded bg-gradient-to-b from-[var(--accent-from)] to-transparent" />
              {upcoming.map((post, i) => (
                <li key={post.id} className="nex-rise-in relative" style={{ animationDelay: `${i * 0.06}s` }}>
                  <span
                    className={`absolute -left-[26px] top-[18px] h-3 w-3 rounded-full border-2 bg-[var(--background)] ${
                      post.status === "processing"
                        ? "border-[var(--warn)] shadow-[0_0_10px_var(--warn)]"
                        : i === 0
                          ? "border-[var(--accent-from)] shadow-[0_0_12px_var(--accent-from)]"
                          : "border-[var(--faint)]"
                    }`}
                  />
                  <div className="nex-card flex items-center justify-between gap-4 rounded-[4px_16px_4px_16px] border border-[var(--line)] bg-[var(--glass)] px-4 py-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[14px] font-semibold">
                        {(post.accounts as unknown as { persona_name: string } | null)?.persona_name}
                        {post.status === "processing" && (
                          <span className="nex-mono rounded-full border border-[var(--warn)]/40 px-2 py-px text-[9.5px] uppercase tracking-wider text-[var(--warn)]">
                            publicando
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[12.5px] text-[var(--muted)]">{post.caption || "Sem legenda"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="nex-mono text-[15px] font-semibold">{hhmm(post.scheduled_at)}</p>
                      <p className="nex-mono text-[10.5px] text-[var(--faint)]">
                        {ddmm(post.scheduled_at)} · {relative(post.scheduled_at, nowMs)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="grid content-start gap-6 lg:col-span-2">
          <div>
            <SectionTitle eyebrow="Ranking" title="Top contas por engajamento" />
            <div className="nex-card nex-beam grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              {topAccounts.length === 0 && (
                <EmptyState variant="accounts" title="Conecte uma conta" description="O ranking aparece aqui assim que houver contas conectadas." compact />
              )}
              {!hasEngagementData && topAccounts.length > 0 && (
                <p className="text-sm text-[var(--muted)]">
                  Ainda sem dados de engajamento. Aparecem aqui depois que os posts publicados forem sincronizados.
                </p>
              )}
              {topAccounts.map((acc, i) => (
                <div key={acc.id} className="nex-rise-in flex items-center gap-3" style={{ animationDelay: `${i * 0.07}s` }}>
                  <span
                    className={`nex-mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      i === 0
                        ? "bg-yellow-400 text-black shadow-[0_0_14px_rgba(250,204,21,0.6)]"
                        : i === 1
                          ? "bg-neutral-300 text-black"
                          : i === 2
                            ? "bg-amber-700 text-white"
                            : "bg-[var(--surface-hover)] text-[var(--muted)]"
                    }`}
                  >
                    {i === 0 ? <Trophy size={12} /> : i + 1}
                  </span>
                  {acc.profile_picture_url ? (
                    <Image
                      src={acc.profile_picture_url}
                      alt={acc.ig_username}
                      width={34}
                      height={34}
                      unoptimized
                      className="h-[34px] w-[34px] shrink-0 rounded-full border border-[var(--line-strong)] object-cover"
                    />
                  ) : (
                    <span className="nex-gradient-bg flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                      {acc.persona_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{acc.persona_name}</p>
                    <div className="nex-bar mt-1.5 !h-1.5">
                      <i style={{ width: `${Math.max(4, (acc.engagement / maxEngagement) * 100)}%`, animationDelay: `${0.2 + i * 0.08}s` }} />
                    </div>
                  </div>
                  <span className="nex-mono shrink-0 text-[13px] text-[var(--muted)]">{acc.engagement.toLocaleString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle eyebrow="Histórico" title="Últimos publicados" />
            <div className="nex-card grid gap-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
              {(lastPublished ?? []).length === 0 && <p className="p-2 text-sm text-[var(--muted)]">Nenhum ainda.</p>}
              {(lastPublished ?? []).map((post) => (
                <div key={post.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-[13px] hover:bg-white/[0.03]">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ok)] shadow-[0_0_8px_var(--ok)]" />
                    <span className="truncate">{(post.accounts as unknown as { persona_name: string } | null)?.persona_name}</span>
                  </span>
                  <span className="nex-mono shrink-0 text-[11.5px] text-[var(--faint)]">
                    {post.published_at ? `${ddmm(post.published_at)} ${hhmm(post.published_at)}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function SectionTitle({
  eyebrow,
  title,
  right,
  action,
}: {
  eyebrow: string;
  title: string;
  right?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <span className="nex-eyebrow">{eyebrow}</span>
        <h2 className="mt-1.5 flex items-center gap-2.5 text-lg font-semibold">
          <span className="h-[18px] w-1 rounded-sm bg-gradient-to-b from-[var(--accent-from)] to-[var(--accent-to)] [clip-path:polygon(0_0,100%_15%,100%_100%,0_85%)]" />
          {title}
        </h2>
      </div>
      {right && <span className="nex-mono text-xs text-[var(--faint)]">{right}</span>}
      {action}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  cta,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
  cta: string;
}) {
  return (
    <div className="nex-card nex-beam flex flex-col justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="nex-display text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
        <span className="nex-icon-chip h-9 w-9 shrink-0">
          <Icon size={18} />
        </span>
      </div>
      <p className="nex-mono text-[32px] font-semibold leading-none tracking-tight">
        <CountUp value={value} />
      </p>
      <Link href={href} className="group inline-flex items-center gap-1.5 text-[13px] text-[var(--accent-solid)] hover:text-white">
        {cta}
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-[4px_14px_4px_14px] border border-[var(--line)] bg-white/[0.025] px-3 py-2.5 transition-transform hover:-translate-y-0.5">
      <Icon size={15} className="text-[var(--accent-solid)]" />
      <p className={`nex-mono mt-1.5 text-[22px] font-semibold leading-none ${tone}`}>
        <CountUp value={value} />
      </p>
      <p className="mt-1 text-[10px] uppercase leading-tight tracking-[0.08em] text-[var(--muted)]">{label}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="nex-mono text-[17px] font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[9.5px] uppercase tracking-[0.1em] text-[var(--faint)]">{label}</p>
    </div>
  );
}
