import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { getContainerStatus, publishContainer } from "@/lib/instagram/graph-api";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const maxDuration = 60;

/**
 * Runs every few minutes (Vercel Cron). Polls containers created by
 * /api/cron/publish and publishes them to Instagram once ready.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: processingPosts, error } = await supabase
    .from("posts")
    .select("id, ig_container_id, accounts(id, ig_business_account_id, access_token_encrypted)")
    .eq("status", "processing");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];

  for (const post of processingPosts ?? []) {
    const account = post.accounts as unknown as {
      id: string;
      ig_business_account_id: string;
      access_token_encrypted: string;
    } | null;

    if (!account || !post.ig_container_id) continue;

    try {
      const accessToken = decryptToken(account.access_token_encrypted);
      const { status_code } = await getContainerStatus(post.ig_container_id, accessToken);

      if (status_code === "FINISHED") {
        const mediaId = await publishContainer(
          account.ig_business_account_id,
          post.ig_container_id,
          accessToken,
        );
        await supabase
          .from("posts")
          .update({ status: "published", ig_media_id: mediaId, published_at: new Date().toISOString() })
          .eq("id", post.id);
        results.push({ postId: post.id, status: "published", mediaId });
      } else if (status_code === "ERROR" || status_code === "EXPIRED") {
        await supabase
          .from("posts")
          .update({ status: "failed", error_message: `Container status: ${status_code}` })
          .eq("id", post.id);
        results.push({ postId: post.id, status: "failed" });
      } else {
        results.push({ postId: post.id, status: "still_processing" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      await supabase.from("posts").update({ status: "failed", error_message: message }).eq("id", post.id);
      results.push({ postId: post.id, error: message });
    }
  }

  return NextResponse.json({ checked: results.length, results });
}
