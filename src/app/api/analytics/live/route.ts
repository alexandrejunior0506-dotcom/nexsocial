import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { getAccountInsights, getMediaInsights } from "@/lib/instagram/graph-api";
import { mapWithConcurrency } from "@/lib/concurrency";

/**
 * On-demand live analytics for a single account: fetches straight from the
 * Instagram Graph API (bypassing the cached daily snapshots) so the account
 * detail view can auto-refresh. Read-only — never writes to Supabase, so it
 * can't affect the cron jobs or scheduling in any way.
 */
export async function GET(req: NextRequest) {
  const accountId = req.nextUrl.searchParams.get("account_id");
  if (!accountId) return NextResponse.json({ error: "account_id is required" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, ig_business_account_id, access_token_encrypted")
    .eq("id", accountId)
    .single();

  if (accountError || !account) {
    return NextResponse.json({ error: accountError?.message || "Conta não encontrada" }, { status: 404 });
  }

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, caption, published_at, ig_media_id")
    .eq("account_id", accountId)
    .eq("status", "published")
    .not("ig_media_id", "is", null)
    .order("published_at", { ascending: false });

  if (postsError) return NextResponse.json({ error: postsError.message }, { status: 500 });

  try {
    const accessToken = decryptToken(account.access_token_encrypted);

    const [accountInsights, postInsights] = await Promise.all([
      getAccountInsights(account.ig_business_account_id, accessToken),
      mapWithConcurrency(posts ?? [], 5, async (post) => {
        try {
          const insights = await getMediaInsights(post.ig_media_id!, accessToken);
          return { id: post.id, caption: post.caption, published_at: post.published_at, ...insights };
        } catch {
          return { id: post.id, caption: post.caption, published_at: post.published_at };
        }
      }),
    ]);

    return NextResponse.json({
      account: accountInsights,
      posts: postInsights,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
