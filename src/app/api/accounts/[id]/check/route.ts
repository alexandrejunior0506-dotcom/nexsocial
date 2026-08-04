import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { getMe } from "@/lib/instagram/graph-api";

/** Manually re-checks whether a connected account is still reachable via the Instagram API. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: account, error: fetchError } = await supabase
    .from("accounts")
    .select("id, access_token_encrypted")
    .eq("id", id)
    .single();

  if (fetchError || !account) {
    return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
  }

  try {
    const accessToken = decryptToken(account.access_token_encrypted);
    const me = await getMe(accessToken);

    const { data: updated, error: updateError } = await supabase
      .from("accounts")
      .update({
        ig_username: me.username,
        profile_picture_url: me.profile_picture_url ?? null,
        status: "active",
        last_checked_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ account: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";

    const { data: updated } = await supabase
      .from("accounts")
      .update({ status: "error", last_checked_at: new Date().toISOString(), last_error: message })
      .eq("id", id)
      .select()
      .single();

    return NextResponse.json({ account: updated, error: message }, { status: 200 });
  }
}
