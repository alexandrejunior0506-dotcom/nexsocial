import Link from "next/link";
import { signOutAction } from "@/lib/actions/sign-out";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar", label: "Calendário" },
  { href: "/posts/new", label: "Novo post" },
  { href: "/accounts", label: "Contas" },
  { href: "/analytics", label: "Analytics" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-neutral-950 text-white">
      <aside className="flex w-56 flex-col border-r border-neutral-800 p-4">
        <p className="mb-6 px-2 text-lg font-semibold">NexSocial</p>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-2 text-sm text-neutral-300 hover:bg-neutral-900 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOutAction}>
          <button className="rounded-md px-2 py-2 text-left text-sm text-neutral-500 hover:text-white">
            Sair
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
