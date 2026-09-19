import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { cleanupPublishedVideos } from "@/lib/storage-cleanup";

export const maxDuration = 60;

/**
 * Frees Supabase Storage by deleting videos of already-published posts (see storage-cleanup.ts).
 * Also runs automatically at the end of /api/cron/sync-analytics; this route is for manual runs.
 * Use ?dry=1 to only report what would be deleted.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await cleanupPublishedVideos(createServiceClient(), {
      dryRun: req.nextUrl.searchParams.get("dry") === "1",
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, { status: 500 });
  }
}
