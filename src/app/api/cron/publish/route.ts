import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { createReelsContainer } from "@/lib/instagram/graph-api";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const maxDuration = 60;

/**
 * Runs every few minutes (Vercel Cron). Finds posts due for publishing and
 * creates their Reels media container on Instagram. Actual publish happens
 * once the container finishes processing, in /api/cron/check-containers.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: duePosts, error } = await supabase
    .from("posts")
    .select("id, video_url, cover_url, caption, account_id, accounts(id, ig_business_account_id, access_token_encrypted)")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];

  for (const post of duePosts ?? []) {
    const account = post.accounts as unknown as {
      id: string;
      ig_business_account_id: string;
      access_token_encrypted: string;
    } | null;

    if (!account) {
      await supabase
        .from("posts")
        .update({ status: "failed", error_message: "Conta não encontrada" })
        .eq("id", post.id);
      continue;
    }

    try {
      const accessToken = decryptToken(account.access_token_encrypted);
      const containerId = await createReelsContainer(
        account.ig_business_account_id,
        accessToken,
        post.video_url,
        post.caption,
        post.cover_url,
      );

      await supabase
        .from("posts")
        .update({ status: "processing", ig_container_id: containerId })
        .eq("id", post.id);

      results.push({ postId: post.id, containerId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      await supabase.from("posts").update({ status: "failed", error_message: message }).eq("id", post.id);
      results.push({ postId: post.id, error: message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
