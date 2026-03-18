import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await request.json();
  const board = await prisma.board.update({ where: { id, userId }, data });
  return NextResponse.json(board);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const boardCount = await prisma.board.count({ where: { userId } });
  if (boardCount <= 1) {
    return NextResponse.json({ error: "Cannot delete your only board" }, { status: 400 });
  }

  // Find all tickets on this board
  const boardTickets = await prisma.boardTicket.findMany({ where: { boardId: id } });
  const ticketIds = boardTickets.map((bt) => bt.ticketId);

  // Delete time entries for those tickets
  if (ticketIds.length > 0) {
    await prisma.timeEntry.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
  }

  // Delete the board (cascades to BoardMember, BoardTicket)
  await prisma.board.delete({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
