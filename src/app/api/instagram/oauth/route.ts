import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_insights",
].join(",");

/** Kicks off the Instagram Business Login dialog so the user can connect an Instagram account. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", process.env.INSTAGRAM_APP_ID!);
  url.searchParams.set("redirect_uri", process.env.META_REDIRECT_URI!);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("response_type", "code");

  return NextResponse.redirect(url.toString());
}
