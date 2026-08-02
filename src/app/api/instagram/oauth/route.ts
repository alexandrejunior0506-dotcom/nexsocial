import { NextResponse } from "next/server";
import { auth } from "@/auth";

const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
].join(",");

/** Kicks off the Meta OAuth dialog so the user can connect a Facebook Page + Instagram account. */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.redirect("/login");

  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", process.env.META_APP_ID!);
  url.searchParams.set("redirect_uri", process.env.META_REDIRECT_URI!);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("response_type", "code");

  return NextResponse.redirect(url.toString());
}
