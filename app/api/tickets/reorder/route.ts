import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// POST /api/tickets/reorder — update orderIndex for all tickets after drag
// Body: { orderedIds: string[] }
export async function POST(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderedIds } = await request.json() as { orderedIds: string[] };

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.ticket.update({
        where: { id, userId },
        data: { orderIndex: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
