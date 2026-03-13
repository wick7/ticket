import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// PATCH /api/tickets/:id — update a ticket
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await request.json();

  const ticket = await prisma.ticket.update({
    where: { id },
    data,
  });

  return NextResponse.json(ticket);
}

// DELETE /api/tickets/:id
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.ticket.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
