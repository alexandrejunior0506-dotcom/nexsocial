import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { getAccountInsights, getMediaInsights } from "@/lib/instagram/graph-api";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { mapWithConcurrency } from "@/lib/concurrency";

export const maxDuration = 60;

const SYNC_WINDOW_DAYS = 30;

/** Runs a few times a day. Snapshots account-level insights and refreshes per-post engagement. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id, ig_business_account_id, access_token_encrypted");

  if (accountsError) return NextResponse.json({ error: accountsError.message }, { status: 500 });

  const accountResults = await mapWithConcurrency(accounts ?? [], 8, async (account) => {
    try {
      const accessToken = decryptToken(account.access_token_encrypted);
      const insights = await getAccountInsights(account.ig_business_account_id, accessToken);

      await supabase.from("account_analytics_snapshots").upsert(
        {
          account_id: account.id,
          date: today,
          followers_count: insights.followers_count ?? null,
          impressions: insights.impressions ?? null,
          reach: insights.reach ?? null,
          profile_views: insights.profile_views ?? null,
        },
        { onConflict: "account_id,date" },
      );

      return { accountId: account.id, status: "ok" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      return { accountId: account.id, status: "error", error: message };
    }
  });

  // Only posts published recently keep changing meaningfully; older ones keep their last saved numbers.
  // This also keeps the run inside the 60s limit as the number of published posts grows.
  const since = new Date(Date.now() - SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: publishedPosts, error: postsError } = await supabase
    .from("posts")
    .select("id, ig_media_id, accounts(access_token_encrypted)")
    .eq("status", "published")
    .not("ig_media_id", "is", null)
    .gte("published_at", since);

  if (postsError) return NextResponse.json({ error: postsError.message }, { status: 500 });

  // One analytics row per post per (UTC) day: today's existing rows get updated instead of piling up.
  const todayRowByPost = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const { data: rows, error: rowsError } = await supabase
      .from("post_analytics")
      .select("id, post_id")
      .gte("fetched_at", `${today}T00:00:00.000Z`)
      .range(from, from + 999);
    if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 500 });
    for (const row of rows ?? []) todayRowByPost.set(row.post_id, row.id);
    if (!rows || rows.length < 1000) break;
  }

  const postResults = await mapWithConcurrency(publishedPosts ?? [], 8, async (post) => {
    const account = post.accounts as unknown as { access_token_encrypted: string } | null;
    if (!account || !post.ig_media_id) return { postId: post.id, status: "skipped" };

    try {
      const accessToken = decryptToken(account.access_token_encrypted);
      const insights = await getMediaInsights(post.ig_media_id, accessToken);

      const values = {
        likes: insights.likes ?? null,
        comments: insights.comments ?? null,
        shares: insights.shares ?? null,
        saves: insights.saved ?? null,
        reach: insights.reach ?? null,
        plays: insights.plays ?? null,
        fetched_at: new Date().toISOString(),
      };

      const existingRowId = todayRowByPost.get(post.id);
      const { error: writeError } = existingRowId
        ? await supabase.from("post_analytics").update(values).eq("id", existingRowId)
        : await supabase.from("post_analytics").insert({ post_id: post.id, ...values });
      if (writeError) throw new Error(writeError.message);

      return { postId: post.id, status: "ok" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      return { postId: post.id, status: "error", error: message };
    }
  });

  return NextResponse.json({ accounts: accountResults, posts: postResults });
}
