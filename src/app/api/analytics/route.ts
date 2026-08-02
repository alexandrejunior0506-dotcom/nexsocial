import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("account_id");
  if (!accountId) return NextResponse.json({ error: "account_id is required" }, { status: 400 });

  const supabase = createServiceClient();

  const [{ data: snapshots, error: snapshotsError }, { data: posts, error: postsError }] =
    await Promise.all([
      supabase
        .from("account_analytics_snapshots")
        .select("date, followers_count, impressions, reach, profile_views")
        .eq("account_id", accountId)
        .order("date", { ascending: true }),
      supabase
        .from("posts")
        .select("id, caption, published_at, post_analytics(likes, comments, shares, saves, reach, plays, fetched_at)")
        .eq("account_id", accountId)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .order("fetched_at", { referencedTable: "post_analytics", ascending: false }),
    ]);

  if (snapshotsError) return NextResponse.json({ error: snapshotsError.message }, { status: 500 });
  if (postsError) return NextResponse.json({ error: postsError.message }, { status: 500 });

  return NextResponse.json({ snapshots, posts });
}
