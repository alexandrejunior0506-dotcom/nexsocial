import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const WINDOW_START_MIN = 8 * 60; // 08:00
const WINDOW_END_MIN = 23 * 60; // 23:00

function brasiliaDateStr(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export async function POST(req: NextRequest) {
  const { account_id, caption, cover_url, video_urls, posts_per_day } = await req.json();

  if (!account_id || !Array.isArray(video_urls) || video_urls.length === 0) {
    return NextResponse.json({ error: "account_id e video_urls são obrigatórios" }, { status: 400 });
  }

  const postsPerDay = Math.max(1, Math.min(10, Number(posts_per_day) || 3));

  const supabase = createServiceClient();

  const { data: lastForAccount, error: lastError } = await supabase
    .from("posts")
    .select("scheduled_at")
    .eq("account_id", account_id)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: false })
    .limit(1);

  if (lastError) return NextResponse.json({ error: lastError.message }, { status: 500 });

  const { data: allScheduled, error: allError } = await supabase
    .from("posts")
    .select("scheduled_at")
    .eq("status", "scheduled");

  if (allError) return NextResponse.json({ error: allError.message }, { status: 500 });

  const usedTimestamps = new Set((allScheduled ?? []).map((p) => new Date(p.scheduled_at).toISOString()));

  let startDate: Date;
  if (lastForAccount && lastForAccount.length > 0) {
    const lastDayStr = brasiliaDateStr(new Date(lastForAccount[0].scheduled_at));
    startDate = new Date(`${lastDayStr}T12:00:00-03:00`);
    startDate.setDate(startDate.getDate() + 1);
  } else {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    startDate = new Date(`${brasiliaDateStr(tomorrow)}T12:00:00-03:00`);
  }

  const segmentSize = (WINDOW_END_MIN - WINDOW_START_MIN) / postsPerDay;
  const rows = video_urls.map((videoUrl: string, i: number) => {
    const dayOffset = Math.floor(i / postsPerDay);
    const slot = i % postsPerDay;

    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + dayOffset);
    const dayStr = brasiliaDateStr(dayDate);

    const segStart = WINDOW_START_MIN + slot * segmentSize;
    const randomOffset = Math.floor(Math.random() * segmentSize);
    const minuteOfDay = Math.floor(segStart + randomOffset);

    let cursor = new Date(`${dayStr}T${pad(Math.floor(minuteOfDay / 60))}:${pad(minuteOfDay % 60)}:00-03:00`);
    let candidateIso = "";
    // Advances minute-by-minute (rolling into later days if needed) until a free slot is found.
    for (let attempt = 0; attempt < 20000; attempt++) {
      const iso = cursor.toISOString();
      if (!usedTimestamps.has(iso)) {
        candidateIso = iso;
        usedTimestamps.add(iso);
        break;
      }
      cursor = new Date(cursor.getTime() + 60000);
    }

    return {
      account_id,
      video_url: videoUrl,
      cover_url: cover_url || null,
      caption: caption || "",
      scheduled_at: candidateIso,
      status: "scheduled" as const,
    };
  });

  if (rows.some((r) => !r.scheduled_at)) {
    return NextResponse.json({ error: "Não foi possível encontrar horários livres para todos os vídeos" }, { status: 500 });
  }

  const { data: inserted, error: insertError } = await supabase.from("posts").insert(rows).select();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const dates = (inserted ?? []).map((p) => brasiliaDateStr(new Date(p.scheduled_at)));
  const startLabel = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null;
  const endLabel = dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null;

  return NextResponse.json({ posts: inserted, startDate: startLabel, endDate: endLabel });
}
