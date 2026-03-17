import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { requireAuth } from "@/lib/auth";

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface UserInfoResponse {
  email?: string;
  name?: string;
}

export async function GET(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/settings?error=gmail_denied", request.url));
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json() as TokenResponse;

  if (!tokenData.access_token) {
    console.error("Gmail OAuth error:", tokenData.error_description);
    return NextResponse.redirect(new URL("/settings?error=gmail_token_failed", request.url));
  }

  // Fetch user profile
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const profile = await profileRes.json() as UserInfoResponse;
  const displayName = profile.email ?? "Gmail Account";

  const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000);

  await prisma.oAuthToken.upsert({
    where: { service_userId: { service: "gmail", userId } },
    create: {
      service: "gmail",
      userId,
      token: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
      expiresAt,
      metadata: { displayName, last_fetched_at: null },
    },
    update: {
      token: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
      expiresAt,
      metadata: { displayName, last_fetched_at: null },
    },
  });

  return NextResponse.redirect(new URL("/settings?connected=gmail", request.url));
}
