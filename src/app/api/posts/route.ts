import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, video_url, cover_url, caption, scheduled_at, status, published_at, error_message, accounts(persona_name, ig_username)")
    .order("scheduled_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data });
}

export async function POST(req: NextRequest) {
  const { account_id, video_url, cover_url, caption, scheduled_at } = await req.json();

  if (!account_id || !video_url || !scheduled_at) {
    return NextResponse.json(
      { error: "account_id, video_url and scheduled_at are required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      account_id,
      video_url,
      cover_url: cover_url || null,
      caption: caption || "",
      scheduled_at,
      status: "scheduled",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: data });
}
