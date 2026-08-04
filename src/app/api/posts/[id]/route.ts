import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { caption, scheduled_at } = await req.json();

  const updates: Record<string, string> = {};
  if (typeof caption === "string") updates.caption = caption;
  if (typeof scheduled_at === "string") updates.scheduled_at = scheduled_at;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", id)
    .in("status", ["scheduled", "draft", "failed"])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) {
    return NextResponse.json(
      { error: "Só é possível editar posts agendados, em rascunho ou que falharam" },
      { status: 400 },
    );
  }
  return NextResponse.json({ post: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", id)
    .in("status", ["scheduled", "draft", "failed"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
