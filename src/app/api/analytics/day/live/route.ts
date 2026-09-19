import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { getMediaInsights } from "@/lib/instagram/graph-api";
import { mapWithConcurrency } from "@/lib/concurrency";

export const maxDuration = 60;

const TZ = "America/Sao_Paulo";

/**
 * On-demand live metrics for every video published on one day (all accounts), straight from the
 * Instagram Graph API. Manual and read-only: it never writes anything, so it can't affect the crons.
 */
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
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, ig_media_id, accounts(access_token_encrypted)")
    .eq("status", "published")
    .not("ig_media_id", "is", null)
    .gte("published_at", dayStart.toISOString())
    .lt("published_at", dayEnd.toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = await mapWithConcurrency(posts ?? [], 5, async (post) => {
    const account = post.accounts as unknown as { access_token_encrypted: string } | null;
    if (!account || !post.ig_media_id) return null;
    try {
      const insights = await getMediaInsights(post.ig_media_id, decryptToken(account.access_token_encrypted));
      return { id: post.id, ...insights };
    } catch {
      return null;
    }
  });

  const ok = results.filter((r) => r !== null);
  return NextResponse.json({
    date,
    posts: ok,
    failed: results.length - ok.length,
    fetchedAt: new Date().toISOString(),
  });
}
