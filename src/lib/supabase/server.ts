import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service role key.
 * NexSocial is single-user, so we bypass RLS/user-scoped auth here and
 * rely on the app's own login (NextAuth) to gate access to these routes.
 * Never import this file from client components.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
