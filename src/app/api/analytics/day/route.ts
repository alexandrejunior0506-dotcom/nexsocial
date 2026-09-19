import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const TZ = "America/Sao_Paulo";

interface MetricsRow {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  plays: number | null;
  fetched_at: string;
}

interface AccountRef {
  persona_name: string;
  ig_username: string;
  profile_picture_url: string | null;
}

/** Videos published on one day (Brasília time), one entry per video with its latest saved metrics. */
export async function GET(req: NextRequest) {
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const requested = req.nextUrl.searchParams.get("date");
  if (requested && !/^\d{4}-\d{2}-\d{2}$/.test(requested)) {
    return NextResponse.json({ error: "date inválida (use AAAA-MM-DD)" }, { status: 400 });
  }
  const date = requested || todayStr;

  const dayStart = new Date(`${date}T00:00:00-03:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, account_id, published_at, accounts(persona_name, ig_username, profile_picture_url), post_analytics(likes, comments, shares, saves, reach, plays, fetched_at)",
    )
    .eq("status", "published")
    .gte("published_at", dayStart.toISOString())
    .lt("published_at", dayEnd.toISOString())
    .order("published_at", { ascending: true })
    .order("fetched_at", { referencedTable: "post_analytics", ascending: false })
    .limit(1, { referencedTable: "post_analytics" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const posts = (data ?? []).map((post) => {
    const account = post.accounts as unknown as AccountRef | null;
    const metrics = (post.post_analytics as unknown as MetricsRow[] | null)?.[0] ?? null;
    return {
      id: post.id,
      account_id: post.account_id,
      persona_name: account?.persona_name ?? "Conta removida",
      ig_username: account?.ig_username ?? "",
      profile_picture_url: account?.profile_picture_url ?? null,
      published_at: post.published_at,
      metrics,
    };
  });

  return NextResponse.json({ date, posts });
}
