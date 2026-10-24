"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  Ellipsis,
  Layers,
  LayoutDashboard,
  LogOut,
  Plus,
  PlusCircle,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOutAction } from "@/lib/actions/sign-out";
import { TopClock, TopStatus } from "@/components/top-status";

type NavItem = { href: string; label: string; hint: string; icon: LucideIcon };

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Visão geral",
    items: [
      { href: "/dashboard", label: "Painel", hint: "O dia em tempo real", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", hint: "Engajamento por vídeo", icon: BarChart3 },
      { href: "/calendar", label: "Calendário", hint: "Tudo que está na fila", icon: CalendarDays },
    ],
  },
  {
    title: "Publicar",
    items: [
      { href: "/posts/new", label: "Novo post", hint: "Um vídeo por vez", icon: PlusCircle },
      { href: "/posts/bulk", label: "Lote", hint: "Vários vídeos de uma vez", icon: Layers },
    ],
  },
  {
    title: "Gestão",
    items: [{ href: "/accounts", label: "Contas", hint: "Perfis e legendas fixas", icon: Users }],
  },
];

const ALL_ITEMS = GROUPS.flatMap((g) => g.items);

// Abas fixas embaixo no celular (as mais usadas); o resto fica em "Mais".
const TABS: NavItem[] = [ALL_ITEMS[0], ALL_ITEMS[1], ALL_ITEMS[2]];

const isActive = (pathname: string, href: string) =>
  href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex shrink-0 items-center gap-3">
      <span className="nex-halo">
        <Image src="/logo-icon.jpg" alt="NexSocial" width={34} height={34} className="rounded-lg" priority />
      </span>
      <span className="leading-none">
        <span className="nex-display block text-[18px] font-bold tracking-tight">
          Nex<span className="nex-gradient-text">Social</span>
        </span>
        {!compact && (
          <span className="nex-mono mt-1 block text-[9.5px] uppercase tracking-[0.2em] text-[var(--faint)]">
            Reels em órbita
          </span>
        )}
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [more, setMore] = useState(false);

  useEffect(() => {
    document.body.style.overflow = more ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [more]);

  const inMore = !TABS.some((t) => isActive(pathname, t.href));

  return (
    <div className="min-h-screen text-[var(--foreground)] lg:flex">
      {/* Desktop: barra lateral fixa */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-[var(--line)] bg-[var(--glass)] backdrop-blur-xl lg:flex">
        <div className="flex h-[76px] items-center border-b border-[var(--line)] px-5">
          <Brand />
        </div>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="nex-mono px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--faint)]">{group.title}</p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium ${
                        active
                          ? "bg-[var(--surface-hover)]/80 text-white shadow-[inset_0_0_0_1px_var(--line)]"
                          : "text-[var(--muted)] hover:bg-[var(--surface-hover)]/50 hover:text-white"
                      }`}
                    >
                      <span
                        className={`nex-gradient-bg absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full shadow-[0_0_12px_var(--accent-from)] transition-opacity ${
                          active ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <item.icon
                        size={19}
                        strokeWidth={active ? 2.3 : 2}
                        className={`shrink-0 transition-transform group-hover:scale-110 ${active ? "text-[var(--accent-solid)]" : ""}`}
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {active && <span className="nex-pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--accent-solid)]" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--line)] p-3">
          <form action={signOutAction}>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-[var(--muted)] hover:bg-[var(--bad)]/10 hover:text-[var(--bad)]">
              <LogOut size={18} className="shrink-0" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1 lg:ml-[264px]">
        {/* Barra superior: relógio, progresso do dia e próxima publicação */}
        <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--background)]/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
          <div className="mx-auto flex h-[60px] max-w-[1400px] items-center justify-between gap-3 px-4 sm:h-[68px] lg:px-8">
            <div className="flex items-center gap-4">
              <span className="lg:hidden">
                <Brand compact />
              </span>
              <span className="hidden lg:block">
                <TopClock />
              </span>
            </div>
            <div className="flex items-center gap-3">
              <TopStatus />
              <Link
                href="/posts/new"
                className="nex-gradient-bg hidden items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white xl:inline-flex"
              >
                <Plus size={16} strokeWidth={2.6} />
                Novo post
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto min-w-0 max-w-[1400px] px-4 pb-28 pt-6 sm:pt-8 lg:px-8 lg:pb-12">{children}</main>
      </div>

      {/* Celular: abas fixas embaixo + gaveta "Mais" */}
      {more && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in" />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "nex-sheet-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-[var(--line-strong)] bg-[var(--surface)] px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-3"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--line-strong)]" />
            {GROUPS.map((group) => (
              <div key={group.title} className="mb-4">
                <p className="nex-mono px-1 pb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--faint)]">{group.title}</p>
                <div className="grid grid-cols-3 gap-2">
                  {group.items.map((item) => {
                    const on = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMore(false)}
                        className={`flex flex-col items-center gap-2 rounded-2xl border px-1 py-3.5 text-center text-[12.5px] font-semibold active:scale-[0.97] ${
                          on
                            ? "border-[var(--accent-from)]/50 bg-[var(--accent-from)]/12 text-white"
                            : "border-[var(--line)] bg-[var(--surface-hover)]/60 text-[var(--muted)]"
                        }`}
                      >
                        <item.icon size={21} className={on ? "text-[var(--accent-solid)]" : ""} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <form action={signOutAction}>
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--bad)]/30 bg-[var(--bad)]/10 py-3.5 text-[14px] font-semibold text-[var(--bad)]">
                <LogOut size={17} /> Sair do painel
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--background)]/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid h-[64px] max-w-[560px] grid-cols-5">
          {TABS.map(({ href, label, icon: Icon }, i) => {
            const on = !more && isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMore(false)}
                className={`relative flex flex-col items-center justify-center gap-1 ${i === 1 ? "col-start-2" : ""} ${i === 2 ? "col-start-4" : ""}`}
              >
                {on && <span className="nex-gradient-bg absolute top-0 h-[3px] w-8 rounded-b-full shadow-[0_0_12px_var(--accent-from)]" />}
                <Icon size={22} strokeWidth={on ? 2.4 : 2} className={on ? "text-[var(--accent-solid)]" : "text-[var(--muted)]"} />
                <span className={`text-[11px] font-semibold ${on ? "text-white" : "text-[var(--muted)]"}`}>{label}</span>
              </Link>
            );
          })}

          <Link
            href="/posts/new"
            onClick={() => setMore(false)}
            aria-label="Novo post"
            className="col-start-3 row-start-1 -mt-5 flex flex-col items-center"
          >
            <span className="nex-gradient-bg grid size-[52px] place-items-center rounded-2xl text-white shadow-[0_10px_30px_-6px_rgba(5,98,251,0.9)]">
              <Plus size={26} strokeWidth={2.8} />
            </span>
          </Link>

          <button
            onClick={() => setMore((v) => !v)}
            className="relative col-start-5 row-start-1 flex flex-col items-center justify-center gap-1"
          >
            {(more || inMore) && (
              <span className="nex-gradient-bg absolute top-0 h-[3px] w-8 rounded-b-full shadow-[0_0_12px_var(--accent-from)]" />
            )}
            {more ? (
              <X size={22} className="text-[var(--accent-solid)]" />
            ) : (
              <Ellipsis size={22} className={inMore ? "text-[var(--accent-solid)]" : "text-[var(--muted)]"} />
            )}
            <span className={`text-[11px] font-semibold ${more || inMore ? "text-white" : "text-[var(--muted)]"}`}>Mais</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
