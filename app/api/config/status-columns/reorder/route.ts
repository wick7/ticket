import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// POST /api/config/status-columns/reorder
// Body: { ids: string[] } — ordered list of column IDs
export async function POST(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await request.json() as { ids: string[] };
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids array required" }, { status: 400 });

  await Promise.all(
    ids.map((id, index) =>
      prisma.statusColumn.updateMany({
        where: { id, userId },
        data: { order: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
