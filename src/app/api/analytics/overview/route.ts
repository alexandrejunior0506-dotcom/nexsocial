import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface PostAnalyticsRow {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  plays: number | null;
  fetched_at: string;
}

/** Cross-account summary: engagement + follower ranking, and the single most engaged video. */
export async function GET() {
  const supabase = createServiceClient();

  const [{ data: accounts, error: accountsError }, { data: posts, error: postsError }] = await Promise.all([
    supabase.from("accounts").select("id, persona_name, ig_username, profile_picture_url"),
    supabase
      .from("posts")
      .select(
        "id, caption, published_at, account_id, accounts(persona_name, ig_username), post_analytics(likes, comments, shares, saves, plays, fetched_at)",
      )
      .eq("status", "published")
      .order("fetched_at", { referencedTable: "post_analytics", ascending: false }),
  ]);

  if (accountsError) return NextResponse.json({ error: accountsError.message }, { status: 500 });
  if (postsError) return NextResponse.json({ error: postsError.message }, { status: 500 });

  const { data: snapshots } = await supabase
    .from("account_analytics_snapshots")
    .select("account_id, date, followers_count")
    .order("date", { ascending: false });

  const latestFollowers = new Map<string, number>();
  for (const snap of snapshots ?? []) {
    if (!latestFollowers.has(snap.account_id) && snap.followers_count != null) {
      latestFollowers.set(snap.account_id, snap.followers_count);
    }
  }

  const engagementByAccount = new Map<string, number>();
  let topVideo: {
    id: string;
    caption: string;
    persona_name: string;
    ig_username: string;
    published_at: string | null;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    plays: number;
  } | null = null;

  for (const post of posts ?? []) {
    const latest = (post.post_analytics as unknown as PostAnalyticsRow[] | null)?.[0];
    if (!latest) continue;
    const likes = latest.likes ?? 0;
    const comments = latest.comments ?? 0;
    const shares = latest.shares ?? 0;
    const saves = latest.saves ?? 0;
    const plays = latest.plays ?? 0;
    const score = likes + comments + shares + saves;

    engagementByAccount.set(post.account_id, (engagementByAccount.get(post.account_id) ?? 0) + score);

    if (!topVideo || score > topVideo.engagement) {
      const acc = post.accounts as unknown as { persona_name: string; ig_username: string } | null;
      topVideo = {
        id: post.id,
        caption: post.caption,
        persona_name: acc?.persona_name ?? "?",
        ig_username: acc?.ig_username ?? "?",
        published_at: post.published_at,
        engagement: score,
        likes,
        comments,
        shares,
        saves,
        plays,
      };
    }
  }

  const ranking = (accounts ?? [])
    .map((acc) => ({
      ...acc,
      followers_count: latestFollowers.get(acc.id) ?? null,
      engagement: engagementByAccount.get(acc.id) ?? 0,
    }))
    .sort((a, b) => b.engagement - a.engagement);

  return NextResponse.json({ accounts: ranking, topVideo });
}
