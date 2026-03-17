import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Boards the user owns or is a member of
  const boards = await prisma.board.findMany({
    where: {
      OR: [
        { userId },
        { members: { some: { userId } } },
      ],
    },
    include: { members: { select: { userId: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(boards);
}

export async function POST(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, savedFilter } = await request.json();

  const board = await prisma.board.create({
    data: {
      userId,
      name,
      savedFilter: savedFilter ?? {},
    },
  });

  return NextResponse.json(board, { status: 201 });
}
