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

  // Named board: return ONLY tickets explicitly linked to this board
  if (boardId) {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { members: { select: { userId: true } } },
    });
    if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });

    const isMember = board.userId === userId || board.members.some((m) => m.userId === userId);
    if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const boardTickets = await prisma.boardTicket.findMany({
      where: { boardId },
      select: { ticketId: true },
    });
    const ticketIds = boardTickets.map((bt) => bt.ticketId);

    const tickets = await prisma.ticket.findMany({
      where: {
        id: { in: ticketIds },
        ...(company ? { company } : {}),
        ...(status ? { status } : {}),
        ...(urgency ? { urgency } : {}),
        ...(sourceService ? { sourceService } : {}),
      },
      orderBy: { orderIndex: "asc" },
    });
    return NextResponse.json(tickets);
  }

  // Default board: all tickets for this user
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

  const last = await prisma.ticket.findFirst({
    where: { userId },
    orderBy: { orderIndex: "desc" },
  });
  const orderIndex = last ? last.orderIndex + 1 : 0;

  const resolvedCompany = data.company ?? "Unknown";
  const ticketNumber = await generateTicketNumber(resolvedCompany);

  // Ensure the company exists in presets so it appears in all dropdowns
  if (resolvedCompany && resolvedCompany !== "Unknown") {
    await prisma.presetCompany.upsert({
      where: { name_userId: { name: resolvedCompany, userId } },
      update: {},
      create: { name: resolvedCompany, userId },
    });
  }

  // Ensure the category exists in presets
  const resolvedCategory = data.category?.trim();
  if (resolvedCategory) {
    await prisma.presetCategory.upsert({
      where: { name_userId: { name: resolvedCategory, userId } },
      update: {},
      create: { name: resolvedCategory, userId },
    });
  }

  const ticket = await prisma.ticket.create({
    data: {
      userId,
      title: data.title,
      body: data.body ?? "",
      requester: data.requester ?? "Unknown",
      company: resolvedCompany,
      status: data.status ?? "todo",
      urgency: data.urgency ?? "medium",
      sourceService: data.sourceService ?? "manual",
      sourceRef: data.sourceRef ?? null,
      category: data.category ?? "",
      ticketNumber,
      orderIndex,
    },
  });

  // Link to board if one was provided
  if (data.boardId) {
    const board = await prisma.board.findUnique({
      where: { id: data.boardId },
      select: { userId: true },
    });
    if (board && board.userId === userId) {
      await prisma.boardTicket.create({
        data: { boardId: data.boardId, ticketId: ticket.id, orderIndex },
      });
    }
  }

  return NextResponse.json(ticket, { status: 201 });
}
