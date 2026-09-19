import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "videos";

/** Published videos are already on Instagram; keep the file a few days as a safety margin, then free the space. */
export const VIDEO_RETENTION_DAYS = 3;

type Supabase = ReturnType<typeof createServiceClient>;

function fileNameFromUrl(url: string | null): string | null {
  if (!url) return null;
  const last = url.split("?")[0].split("/").pop();
  return last ? decodeURIComponent(last) : null;
}

async function fetchAllPosts(supabase: Supabase, status: "published" | "not-published", cutoffIso?: string) {
  const names: string[] = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase.from("posts").select("video_url");
    query = status === "published" ? query.eq("status", "published") : query.neq("status", "published");
    if (cutoffIso) query = query.lt("published_at", cutoffIso);
    const { data, error } = await query.range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) {
      const name = fileNameFromUrl(row.video_url);
      if (name) names.push(name);
    }
    if (!data || data.length < 1000) break;
  }
  return names;
}

/**
 * Deletes the video files of posts published more than VIDEO_RETENTION_DAYS ago.
 * Covers are kept (tiny, and the bulk scheduler reuses each account's last cover), and any video
 * still referenced by a scheduled/processing/failed post is never touched.
 */
export async function cleanupPublishedVideos(supabase: Supabase, opts: { dryRun?: boolean } = {}) {
  const cutoff = new Date(Date.now() - VIDEO_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const stillNeeded = new Set(await fetchAllPosts(supabase, "not-published"));
  const candidates = new Set(await fetchAllPosts(supabase, "published", cutoff));
  for (const name of stillNeeded) candidates.delete(name);

  // Only act on files that actually still exist in the bucket (so repeated runs are cheap no-ops).
  const existing = new Map<string, number>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 1000, offset });
    if (error) throw new Error(error.message);
    for (const file of data ?? []) {
      if (candidates.has(file.name)) existing.set(file.name, file.metadata?.size ?? 0);
    }
    if (!data || data.length < 1000) break;
  }

  const toDelete = [...existing.keys()];
  const freedBytes = [...existing.values()].reduce((sum, size) => sum + size, 0);

  if (!opts.dryRun) {
    for (let i = 0; i < toDelete.length; i += 100) {
      const { error } = await supabase.storage.from(BUCKET).remove(toDelete.slice(i, i + 100));
      if (error) throw new Error(error.message);
    }
  }

  return { dryRun: !!opts.dryRun, files: toDelete.length, freedMB: Math.round(freedBytes / 1048576) };
}
