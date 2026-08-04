import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("accounts")
    .select(
      "id, persona_name, ig_username, token_expires_at, profile_picture_url, status, last_checked_at, last_error, created_at",
    )
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data });
}

export async function PATCH(req: NextRequest) {
  const { id, persona_name } = await req.json();
  if (!id || !persona_name) {
    return NextResponse.json({ error: "id and persona_name are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("accounts").update({ persona_name }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createServiceClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
