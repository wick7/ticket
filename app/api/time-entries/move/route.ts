import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { ticketId, fromDate, toDate, minutes } = await req.json() as {
    ticketId: string;
    fromDate: string; // YYYY-MM-DD
    toDate: string;   // YYYY-MM-DD
    minutes: number;
  };

  const fromStart = new Date(`${fromDate}T00:00:00Z`);
  const fromEnd   = new Date(`${fromDate}T23:59:59Z`);
  const toDateTime = new Date(`${toDate}T12:00:00Z`);

  // Collect all entries for this ticket on the source date
  const fromEntries = await prisma.timeEntry.findMany({
    where: { ticketId, date: { gte: fromStart, lte: fromEnd } },
  });
  const origTotal = fromEntries.reduce((s, e) => s + e.minutes, 0);

  if (origTotal === 0) {
    return NextResponse.json({ error: "No entries found for that date" }, { status: 400 });
  }

  // Delete all source-date entries for this ticket
  await prisma.timeEntry.deleteMany({
    where: { id: { in: fromEntries.map((e) => e.id) } },
  });

  // If moving less than the total, keep the remainder on the source date
  const remaining = origTotal - minutes;
  if (remaining > 0) {
    await prisma.timeEntry.create({
      data: { ticketId, minutes: remaining, date: new Date(`${fromDate}T12:00:00Z`) },
    });
  }

  // Create the new entry on the target date
  await prisma.timeEntry.create({
    data: { ticketId, minutes, date: toDateTime },
  });

  // Update trackedMinutes on the ticket
  // Deleted: origTotal  Added: remaining (if > 0) + minutes
  // Net = (remaining > 0 ? remaining : 0) + minutes - origTotal
  const addedBack = remaining > 0 ? remaining : 0;
  const netChange = addedBack + minutes - origTotal;
  if (netChange !== 0) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { trackedMinutes: { increment: netChange } },
    });
  }

  return NextResponse.json({ success: true, origTotal, remaining: Math.max(0, remaining), moved: minutes });
}
