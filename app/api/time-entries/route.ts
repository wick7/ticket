import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1), 10);
  const company = searchParams.get("company") ?? "";
  const status = searchParams.get("status") ?? "";
  const urgency = searchParams.get("urgency") ?? "";
  const sourceService = searchParams.get("sourceService") ?? "";

  const startMonth = month;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;

  const start = new Date(`${year}-${String(startMonth).padStart(2, "0")}-01T00:00:00Z`);
  const end = new Date(`${endYear}-${String(endMonth).padStart(2, "0")}-01T00:00:00Z`);

  const entries = await prisma.timeEntry.findMany({
    where: {
      date: { gte: start, lt: end },
      ticket: {
        ...(company ? { company } : {}),
        ...(status ? { status } : {}),
        ...(urgency ? { urgency } : {}),
        ...(sourceService ? { sourceService } : {}),
      },
    },
    include: { ticket: true },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const { ticketId, minutes, date } = await req.json() as {
    ticketId: string;
    minutes: number;
    date: string; // YYYY-MM-DD
  };

  // Store at noon UTC so the date is timezone-safe
  const entry = await prisma.timeEntry.create({
    data: {
      ticketId,
      minutes,
      date: new Date(`${date}T12:00:00Z`),
    },
  });

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { trackedMinutes: { increment: minutes } },
  });

  return NextResponse.json(entry);
}
