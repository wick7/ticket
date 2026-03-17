import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// POST /api/tickets/[id]/move-board
// Body: { targetBoardId: string | null }
// Removes ticket from all boards, then adds to targetBoardId if provided.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify ticket ownership
  const ticket = await prisma.ticket.findUnique({ where: { id, userId }, select: { id: true, orderIndex: true } });
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { targetBoardId } = await request.json() as { targetBoardId: string | null };

  // Remove from all boards
  await prisma.boardTicket.deleteMany({ where: { ticketId: id } });

  // Add to target board if specified
  if (targetBoardId) {
    const board = await prisma.board.findUnique({
      where: { id: targetBoardId },
      include: { members: { select: { userId: true } } },
    });
    if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

    const isMember = board.userId === userId || board.members.some((m) => m.userId === userId);
    if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.boardTicket.create({
      data: { boardId: targetBoardId, ticketId: id, orderIndex: ticket.orderIndex },
    });
  }

  return NextResponse.json({ success: true, boardId: targetBoardId });
}
