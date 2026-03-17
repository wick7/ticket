import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// DELETE /api/boards/:id/members/:userId — remove a member (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const sessionUserId = await requireAuth(request);
  if (!sessionUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boardId, userId: targetUserId } = await params;

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });
  if (board.userId !== sessionUserId) return NextResponse.json({ error: "Only the board owner can remove members" }, { status: 403 });

  await prisma.boardMember.delete({
    where: { boardId_userId: { boardId, userId: targetUserId } },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
