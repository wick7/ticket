import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { date } = await req.json() as { date: string }; // YYYY-MM-DD
  const entry = await prisma.timeEntry.update({
    where: { id },
    data: { date: new Date(`${date}T12:00:00Z`) },
  });
  return NextResponse.json(entry);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = await prisma.timeEntry.delete({ where: { id } });
  await prisma.ticket.update({
    where: { id: entry.ticketId },
    data: { trackedMinutes: { decrement: entry.minutes } },
  });
  return NextResponse.json({ success: true });
}
