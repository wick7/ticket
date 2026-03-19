import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const company = searchParams.get("company");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!company || !startDate || !endDate) {
    return NextResponse.json({ error: "company, startDate, and endDate are required" }, { status: 400 });
  }

  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T23:59:59Z`);

  const tickets = await prisma.ticket.findMany({
    where: {
      userId,
      company,
      timeEntries: { some: { date: { gte: start, lte: end } } },
    },
    select: { ticketNumber: true, status: true, trackedMinutes: true, title: true },
    orderBy: { ticketNumber: "asc" },
  });

  return NextResponse.json(tickets);
}
