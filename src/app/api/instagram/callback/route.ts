import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  exchangeCodeForShortLivedToken,
  exchangeForLongLivedToken,
  getInstagramUsername,
} from "@/lib/instagram/graph-api";
import { encryptToken } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/server";

/** Handles the redirect back from Meta's OAuth dialog: exchanges tokens and stores connected accounts. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL(`/accounts?error=${error || "no_code"}`, req.url));
  }

  try {
    const shortLived = await exchangeCodeForShortLivedToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token);
    const igUserId = String(shortLived.user_id);
    const username = await getInstagramUsername(igUserId, longLived.access_token);

    const supabase = createServiceClient();
    const expiresAt = new Date(Date.now() + longLived.expires_in * 1000).toISOString();

    await supabase
      .from("accounts")
      .upsert(
        {
          persona_name: username,
          ig_username: username,
          ig_business_account_id: igUserId,
          access_token_encrypted: encryptToken(longLived.access_token),
          token_expires_at: expiresAt,
        },
        { onConflict: "ig_business_account_id" },
      );

    return NextResponse.redirect(new URL("/accounts?connected=1", req.url));
  } catch (err) {
    console.error("Instagram OAuth callback failed", err);
    return NextResponse.redirect(new URL("/accounts?error=oauth_failed", req.url));
  }
}
