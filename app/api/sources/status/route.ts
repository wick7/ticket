import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [slack, microsoft] = await Promise.all([
    prisma.oAuthToken.findUnique({ where: { service: "slack" } }),
    prisma.oAuthToken.findUnique({ where: { service: "outlook" } }),
  ]);

  const slackMeta = slack?.metadata as { teamName?: string; last_fetched_at?: string | null } | null;
  const msMeta = microsoft?.metadata as { displayName?: string; last_fetched_at?: string | null } | null;

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
  });
}

export async function DELETE(request: Request) {
  const { service } = await request.json() as { service: string };
  const serviceKey = service === "teams" ? "outlook" : service;
  await prisma.oAuthToken.delete({ where: { service: serviceKey } }).catch(() => {});
  return NextResponse.json({ success: true });
}
