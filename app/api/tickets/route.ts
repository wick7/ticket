import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateTicketNumber } from "@/lib/tickets";

// GET /api/tickets — list all tickets with optional filters
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const company = searchParams.get("company");
  const status = searchParams.get("status");
  const urgency = searchParams.get("urgency");
  const sourceService = searchParams.get("sourceService");

  const tickets = await prisma.ticket.findMany({
    where: {
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
  const data = await request.json();

  // Place new ticket at the bottom
  const last = await prisma.ticket.findFirst({
    orderBy: { orderIndex: "desc" },
  });
  const orderIndex = last ? last.orderIndex + 1 : 0;

  const resolvedCompany = data.company ?? "Unknown";
  const ticketNumber = await generateTicketNumber(resolvedCompany);

  const ticket = await prisma.ticket.create({
    data: {
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
