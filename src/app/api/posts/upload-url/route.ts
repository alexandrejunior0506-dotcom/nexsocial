import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

const BUCKET = "videos";

/**
 * Returns a signed upload URL so the browser can upload the video file directly
 * to Supabase Storage, bypassing Next.js API body size limits.
 */
export async function POST(req: NextRequest) {
  const { fileName } = await req.json();
  if (!fileName) return NextResponse.json({ error: "fileName is required" }, { status: 400 });

  const extension = (fileName.includes(".") ? fileName.split(".").pop() : "") || "mp4";
  const path = `${randomUUID()}.${extension}`;

  const supabase = createServiceClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    path,
    signedUrl: data.signedUrl,
    token: data.token,
    publicUrl: publicUrlData.publicUrl,
  });
}
