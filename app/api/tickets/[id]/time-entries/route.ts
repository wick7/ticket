import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entries = await prisma.timeEntry.findMany({
    where: { ticketId: id },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(entries);
}
