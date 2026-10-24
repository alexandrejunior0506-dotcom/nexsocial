"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email ou senha incorretos.");
      return;
    }

    window.location.href = callbackUrl;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="nex-reveal mb-8 flex flex-col items-center text-center">
          <span className="nex-halo">
            <Image src="/logo-icon.jpg" alt="NexSocial" width={76} height={76} className="rounded-2xl" priority />
          </span>
          <h1 className="mt-6 text-[34px] font-bold leading-none tracking-tight">
            Nex<span className="nex-gradient-text">Social</span>
          </h1>
          <p className="nex-mono mt-3 text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">Reels em órbita</p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ animationDelay: "0.12s" }}
          className="nex-panel nex-reveal space-y-5 p-7 sm:p-8"
        >
          <p className="text-sm text-[var(--muted)]">Área interna da agência Nex.</p>

          <div className="space-y-1.5">
            <label className="nex-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--muted)]" htmlFor="email">
              Email
            </label>
            <div className="group relative">
              <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--faint)] transition-colors group-focus-within:text-[var(--accent-solid)]" />
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[4px_12px_4px_12px] border border-[var(--line)] bg-[var(--background)]/70 py-3 pl-11 pr-3 text-[15px] text-white outline-none transition focus:border-[var(--accent-from)] focus:shadow-[0_0_0_3px_rgba(23,169,254,0.14)]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="nex-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--muted)]" htmlFor="password">
              Senha
            </label>
            <div className="group relative">
              <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--faint)] transition-colors group-focus-within:text-[var(--accent-solid)]" />
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[4px_12px_4px_12px] border border-[var(--line)] bg-[var(--background)]/70 py-3 pl-11 pr-3 text-[15px] text-white outline-none transition focus:border-[var(--accent-from)] focus:shadow-[0_0_0_3px_rgba(23,169,254,0.14)]"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="animate-scale-in rounded-[4px_12px_4px_12px] border border-[var(--bad)]/40 bg-[var(--bad)]/10 px-3 py-2 text-sm text-[var(--bad)]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="nex-gradient-bg flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Entrando...
              </>
            ) : (
              <>
                Entrar <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        <p className="nex-mono mt-6 flex items-center justify-center gap-2 text-[11px] text-[var(--faint)]">
          <ShieldCheck size={13} /> acesso restrito · sessão criptografada
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
