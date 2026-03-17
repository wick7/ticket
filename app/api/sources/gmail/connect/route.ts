import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI must be set in .env.local" },
      { status: 500 }
    );
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  return NextResponse.redirect(url.toString());
}
