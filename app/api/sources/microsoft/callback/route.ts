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

interface ProfileResponse {
  displayName?: string;
  mail?: string;
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
    return NextResponse.redirect(
      new URL("/settings?error=microsoft_denied", request.url)
    );
  }

  const tokenRes = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
        grant_type: "authorization_code",
        scope: "offline_access User.Read Mail.Read Chat.Read",
      }),
    }
  );

  const tokenData = await tokenRes.json() as TokenResponse;

  if (!tokenData.access_token) {
    console.error("Microsoft OAuth error:", tokenData.error_description);
    return NextResponse.redirect(
      new URL("/settings?error=microsoft_token_failed", request.url)
    );
  }

  // Fetch user profile
  const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const profile = await profileRes.json() as ProfileResponse;
  const displayName = profile.displayName ?? "Microsoft Account";

  const expiresAt = new Date(
    Date.now() + (tokenData.expires_in ?? 3600) * 1000
  );

  const baseMetadata = { displayName, last_fetched_at: null };

  // Store as "outlook" (covers both Outlook and Teams — same token)
  await prisma.oAuthToken.upsert({
    where: { service_userId: { service: "outlook", userId } },
    create: {
      service: "outlook",
      userId,
      token: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
      expiresAt,
      metadata: baseMetadata,
    },
    update: {
      token: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
      expiresAt,
      metadata: baseMetadata,
    },
  });

  return NextResponse.redirect(
    new URL("/settings?connected=microsoft", request.url)
  );
}
