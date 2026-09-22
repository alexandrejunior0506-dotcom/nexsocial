"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/sign-out";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Painel", icon: HomeIcon },
  { href: "/posts/new", label: "Novo post", icon: PlusIcon },
  { href: "/posts/bulk", label: "Lote", icon: LayersIcon },
  { href: "/calendar", label: "Calendário", icon: CalendarIcon },
  { href: "/analytics", label: "Analytics", icon: ChartIcon },
  { href: "/accounts", label: "Contas", icon: UsersIcon },
];

function Logo() {
  return (
    <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5 px-1">
      <Image src="/logo-icon.jpg" alt="NexSocial" width={28} height={28} className="rounded-md" />
      <span className="nex-mono text-[15px] font-semibold tracking-tight">
        Nex<span className="nex-gradient-text">Social</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] sm:flex">
      {/* Desktop/tablet: fixed left sidebar — the dense "ops panel" the rest of the app is built around. */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur sm:flex">
        <div className="flex h-16 items-center border-b border-[var(--border)] px-4">
          <Logo />
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--surface-hover)] text-[var(--foreground)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
                }`}
              >
                <span
                  className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full nex-gradient-bg transition-opacity ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                <item.icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-[var(--accent-solid)]" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-3">
          <form action={signOutAction}>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--muted)] hover:bg-red-950/30 hover:text-red-400">
              <LogoutIcon className="h-[18px] w-[18px] shrink-0" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile: slim top bar, icon nav scrolls horizontally. */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)]/95 px-3 backdrop-blur sm:hidden">
        <Logo />
        <nav className="ml-2 flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                  active ? "bg-[var(--surface-hover)] text-[var(--accent-solid)]" : "text-[var(--muted)]"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
              </Link>
            );
          })}
        </nav>
        <form action={signOutAction} className="ml-auto shrink-0">
          <button className="rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--muted)]">
            Sair
          </button>
        </form>
      </header>

      <main className="min-w-0 flex-1 p-5 sm:ml-56 sm:p-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
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

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
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

function LayersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3 13 9 5 9-5" strokeLinecap="round" strokeLinejoin="round" />
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

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m16 17 5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
