import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// POST /api/boards/:id/invite — invite a user by email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boardId } = await params;
  const { email } = await request.json() as { email: string };

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Only board owner can invite
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });
  if (board.userId !== userId) return NextResponse.json({ error: "Only the board owner can invite members" }, { status: 403 });

  // Find user by email
  const invitee = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!invitee) {
    return NextResponse.json({ error: "No account found with that email" }, { status: 404 });
  }

  if (invitee.id === userId) {
    return NextResponse.json({ error: "You are already the board owner" }, { status: 400 });
  }

  // Upsert member
  await prisma.boardMember.upsert({
    where: { boardId_userId: { boardId, userId: invitee.id } },
    create: { boardId, userId: invitee.id, role: "member" },
    update: {},
  });

  return NextResponse.json({ success: true });
}

// GET /api/boards/:id/invite — list members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: boardId } = await params;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      members: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
      user: { select: { id: true, email: true, name: true } },
    },
  });

  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

  // Check access
  const isMember = board.userId === userId || board.members.some((m) => m.userId === userId);
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({
    owner: board.user,
    members: board.members.map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt })),
  });
}
