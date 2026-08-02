import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { refreshLongLivedToken } from "@/lib/instagram/graph-api";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export const maxDuration = 30;

/** Runs daily. Refreshes long-lived tokens that expire within the next 7 days. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("id, access_token_encrypted")
    .lte("token_expires_at", soon);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = [];

  for (const account of accounts ?? []) {
    try {
      const currentToken = decryptToken(account.access_token_encrypted);
      const refreshed = await refreshLongLivedToken(currentToken);
      const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

      await supabase
        .from("accounts")
        .update({
          access_token_encrypted: encryptToken(refreshed.access_token),
          token_expires_at: expiresAt,
        })
        .eq("id", account.id);

      results.push({ accountId: account.id, status: "refreshed" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      results.push({ accountId: account.id, status: "error", error: message });
    }
  }

  return NextResponse.json({ refreshed: results.length, results });
}
