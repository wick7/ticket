import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [slack, microsoft, gmail] = await Promise.all([
    prisma.oAuthToken.findUnique({ where: { service_userId: { service: "slack", userId } } }),
    prisma.oAuthToken.findUnique({ where: { service_userId: { service: "outlook", userId } } }),
    prisma.oAuthToken.findUnique({ where: { service_userId: { service: "gmail", userId } } }),
  ]);

  const slackMeta = slack?.metadata as { teamName?: string; last_fetched_at?: string | null } | null;
  const msMeta = microsoft?.metadata as { displayName?: string; last_fetched_at?: string | null } | null;
  const gmailMeta = gmail?.metadata as { displayName?: string; last_fetched_at?: string | null } | null;

  return NextResponse.json({
    slack: {
      connected: !!slack,
      teamName: slackMeta?.teamName ?? null,
      lastFetchedAt: slackMeta?.last_fetched_at ?? null,
    },
    outlook: {
      connected: !!microsoft,
      displayName: msMeta?.displayName ?? null,
      lastFetchedAt: msMeta?.last_fetched_at ?? null,
    },
    teams: {
      connected: !!microsoft, // same token
      lastFetchedAt: (microsoft?.metadata as { teams_last_fetched_at?: string | null } | null)?.teams_last_fetched_at ?? null,
    },
    gmail: {
      connected: !!gmail,
      displayName: gmailMeta?.displayName ?? null,
      lastFetchedAt: gmailMeta?.last_fetched_at ?? null,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { service } = await request.json() as { service: string };
  const serviceKey = service === "teams" ? "outlook" : service;
  await prisma.oAuthToken.delete({
    where: { service_userId: { service: serviceKey, userId } },
  }).catch(() => {});
  return NextResponse.json({ success: true });
}
