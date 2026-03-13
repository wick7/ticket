import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/tickets/reorder — update orderIndex for all tickets after drag
// Body: { orderedIds: string[] }
export async function POST(request: NextRequest) {
  const { orderedIds } = await request.json() as { orderedIds: string[] };

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.ticket.update({
        where: { id },
        data: { orderIndex: index },
      })
    )
  );

  return NextResponse.json({ success: true });
}
