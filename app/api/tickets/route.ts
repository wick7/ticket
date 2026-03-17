import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateTicketNumber } from "@/lib/tickets";
import { requireAuth } from "@/lib/auth";

// GET /api/tickets — list tickets for the authenticated user
export async function GET(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const company = searchParams.get("company");
  const status = searchParams.get("status");
  const urgency = searchParams.get("urgency");
  const sourceService = searchParams.get("sourceService");
  const boardId = searchParams.get("boardId");

  // For a shared board, return tickets from all board members
  if (boardId) {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { members: { select: { userId: true } } },
    });
    if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

    // Check access: user must be owner or member
    const isMember = board.userId === userId || board.members.some((m) => m.userId === userId);
    if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const memberIds = [board.userId, ...board.members.map((m) => m.userId)];

    const tickets = await prisma.ticket.findMany({
      where: {
        userId: { in: memberIds },
        ...(company ? { company } : {}),
        ...(status ? { status } : {}),
        ...(urgency ? { urgency } : {}),
        ...(sourceService ? { sourceService } : {}),
      },
      orderBy: { orderIndex: "asc" },
    });
    return NextResponse.json(tickets);
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      userId,
      ...(company ? { company } : {}),
      ...(status ? { status } : {}),
      ...(urgency ? { urgency } : {}),
      ...(sourceService ? { sourceService } : {}),
    },
    orderBy: { orderIndex: "asc" },
  });

  return NextResponse.json(tickets);
}

// POST /api/tickets — create a ticket
export async function POST(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();

  // Place new ticket at the bottom for this user
  const last = await prisma.ticket.findFirst({
    where: { userId },
    orderBy: { orderIndex: "desc" },
  });
  const orderIndex = last ? last.orderIndex + 1 : 0;

  const resolvedCompany = data.company ?? "Unknown";
  const ticketNumber = await generateTicketNumber(resolvedCompany);

  const ticket = await prisma.ticket.create({
    data: {
      userId,
      title: data.title,
      body: data.body ?? "",
      requester: data.requester ?? "Unknown",
      company: resolvedCompany,
      status: data.status ?? "todo",
      urgency: data.urgency ?? "medium",
      sourceService: "manual",
      sourceRef: data.sourceRef ?? null,
      category: data.category ?? "",
      ticketNumber,
      orderIndex,
    },
  });

  return NextResponse.json(ticket, { status: 201 });
}
