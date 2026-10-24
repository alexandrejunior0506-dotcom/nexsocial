import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";

/** Resumo leve do dia (horário de Brasília) para a barra superior: quanto saiu, quanto falta e a próxima publicação. */
export async function GET() {
  const supabase = createServiceClient();
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const dayStart = new Date(`${todayStr}T00:00:00-03:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [today, next] = await Promise.all([
    supabase
      .from("posts")
      .select("status")
      .gte("scheduled_at", dayStart.toISOString())
      .lt("scheduled_at", dayEnd.toISOString())
      .limit(5000),
    supabase
      .from("posts")
      .select("scheduled_at, accounts(persona_name)")
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: true })
      .limit(1),
  ]);

  if (today.error) return NextResponse.json({ error: today.error.message }, { status: 500 });
  if (next.error) return NextResponse.json({ error: next.error.message }, { status: 500 });

  let published = 0;
  let pending = 0;
  let failed = 0;
  for (const row of today.data ?? []) {
    if (row.status === "published") published++;
    else if (row.status === "failed") failed++;
    else pending++;
  }

  const first = next.data?.[0];
  const account = first?.accounts as unknown as { persona_name: string } | null | undefined;

  return NextResponse.json({
    published,
    pending,
    failed,
    total: published + pending + failed,
    next: first ? { at: first.scheduled_at, who: account?.persona_name ?? null } : null,
  });
}
