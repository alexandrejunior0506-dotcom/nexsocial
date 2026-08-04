import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { getMe, refreshLongLivedToken } from "@/lib/instagram/graph-api";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const maxDuration = 60;

/**
 * Runs daily. For every connected account: checks it's still reachable (updates
 * status/profile picture), and refreshes the long-lived token if it's expiring soon.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, access_token_encrypted, token_expires_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];

  for (const account of accounts ?? []) {
    try {
      let accessToken = decryptToken(account.access_token_encrypted);

      if (account.token_expires_at <= soon) {
        const refreshed = await refreshLongLivedToken(accessToken);
        accessToken = refreshed.access_token;
        await supabase
          .from("accounts")
          .update({
            access_token_encrypted: encryptToken(refreshed.access_token),
            token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          })
          .eq("id", account.id);
      }

      const me = await getMe(accessToken);
      await supabase
        .from("accounts")
        .update({
          ig_username: me.username,
          profile_picture_url: me.profile_picture_url ?? null,
          status: "active",
          last_checked_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", account.id);

      results.push({ accountId: account.id, status: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      await supabase
        .from("accounts")
        .update({ status: "error", last_checked_at: new Date().toISOString(), last_error: message })
        .eq("id", account.id);
      results.push({ accountId: account.id, status: "error", error: message });
    }
  }

  return NextResponse.json({ checked: results.length, results });
}
