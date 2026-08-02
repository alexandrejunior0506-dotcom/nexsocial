import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { getAccountInsights, getMediaInsights } from "@/lib/instagram/graph-api";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const maxDuration = 60;

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

  const accountResults = [];
  for (const account of accounts ?? []) {
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

      accountResults.push({ accountId: account.id, status: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      accountResults.push({ accountId: account.id, status: "error", error: message });
    }
  }

  const { data: publishedPosts, error: postsError } = await supabase
    .from("posts")
    .select("id, ig_media_id, accounts(access_token_encrypted)")
    .eq("status", "published")
    .not("ig_media_id", "is", null);

  if (postsError) return NextResponse.json({ error: postsError.message }, { status: 500 });

  const postResults = [];
  for (const post of publishedPosts ?? []) {
    const account = post.accounts as unknown as { access_token_encrypted: string } | null;
    if (!account || !post.ig_media_id) continue;

    try {
      const accessToken = decryptToken(account.access_token_encrypted);
      const insights = await getMediaInsights(post.ig_media_id, accessToken);

      await supabase.from("post_analytics").insert({
        post_id: post.id,
        likes: insights.likes ?? null,
        comments: insights.comments ?? null,
        shares: insights.shares ?? null,
        saves: insights.saved ?? null,
        reach: insights.reach ?? null,
        plays: insights.plays ?? null,
      });

      postResults.push({ postId: post.id, status: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      postResults.push({ postId: post.id, status: "error", error: message });
    }
  }

  return NextResponse.json({ accounts: accountResults, posts: postResults });
}
