import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const CAPTION_LIMIT = 2200;

// Explicit column list on purpose: never send access_token_encrypted to the browser.
const ACCOUNT_COLUMNS =
  "id, persona_name, ig_username, token_expires_at, profile_picture_url, status, last_checked_at, last_error, created_at";

const MISSING_COLUMN_HINT =
  "O campo de legenda fixa ainda não existe no banco. Rode o SQL de legenda fixa no Supabase (SQL Editor) e tente de novo.";

export async function GET() {
  const supabase = createServiceClient();

  // default_caption is optional until the migration has been applied — fall back so the app keeps working.
  const primary = await supabase
    .from("accounts")
    .select(`${ACCOUNT_COLUMNS}, default_caption`)
    .order("created_at", { ascending: true });
  let data = primary.data as unknown as Record<string, unknown>[] | null;
  let error = primary.error;

  if (error && error.message.includes("default_caption")) {
    const fallback = await supabase
      .from("accounts")
      .select(ACCOUNT_COLUMNS)
      .order("created_at", { ascending: true });
    data = fallback.data as unknown as Record<string, unknown>[] | null;
    error = fallback.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id } = body;

  const update: Record<string, string | null> = {};

  if (body.persona_name !== undefined) {
    if (typeof body.persona_name !== "string" || !body.persona_name.trim()) {
      return NextResponse.json({ error: "persona_name inválido" }, { status: 400 });
    }
    update.persona_name = body.persona_name.trim();
  }

  if ("default_caption" in body) {
    const caption = body.default_caption;
    if (caption !== null && typeof caption !== "string") {
      return NextResponse.json({ error: "default_caption inválida" }, { status: 400 });
    }
    if (typeof caption === "string" && caption.length > CAPTION_LIMIT) {
      return NextResponse.json({ error: `A legenda passa de ${CAPTION_LIMIT} caracteres` }, { status: 400 });
    }
    update.default_caption = caption && caption.trim() ? caption : null;
  }

  if (!id || Object.keys(update).length === 0) {
    return NextResponse.json({ error: "id e pelo menos um campo para atualizar são obrigatórios" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("accounts").update(update).eq("id", id);

  if (error) {
    const status = error.message.includes("default_caption") ? 409 : 500;
    return NextResponse.json(
      { error: status === 409 ? MISSING_COLUMN_HINT : error.message },
      { status },
    );
  }
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
