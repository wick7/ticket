import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { requireAuth } from "@/lib/auth";

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
      new URL(`/settings?error=slack_denied`, request.url)
    );
  }

  // Exchange code for token
  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.SLACK_REDIRECT_URI!,
    }),
  });

  const data = await tokenRes.json() as {
    ok: boolean;
    authed_user?: { access_token: string; id: string };
    team?: { name: string };
    error?: string;
  };

  if (!data.ok || !data.authed_user?.access_token) {
    console.error("Slack OAuth error:", data.error);
    return NextResponse.redirect(
      new URL(`/settings?error=slack_token_failed`, request.url)
    );
  }

  const userToken = data.authed_user.access_token;
  const teamName = data.team?.name ?? "Slack";

  await prisma.oAuthToken.upsert({
    where: { service_userId: { service: "slack", userId } },
    create: {
      service: "slack",
      userId,
      token: encrypt(userToken),
      metadata: { teamName, last_fetched_at: null },
    },
    update: {
      token: encrypt(userToken),
      metadata: { teamName, last_fetched_at: null },
    },
  });

  return NextResponse.redirect(new URL("/settings?connected=slack", request.url));
}
