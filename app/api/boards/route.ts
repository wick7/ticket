import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const boards = await prisma.board.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(boards);
}

export async function POST(request: NextRequest) {
  const { name, savedFilter } = await request.json();

  const board = await prisma.board.create({
    data: {
      name,
      savedFilter: savedFilter ?? {},
    },
  });

  return NextResponse.json(board, { status: 201 });
}
