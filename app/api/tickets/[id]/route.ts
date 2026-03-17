import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// PATCH /api/tickets/:id — update a ticket
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await request.json();

  const ticket = await prisma.ticket.update({
    where: { id, userId },
    data,
  });

  return NextResponse.json(ticket);
}

// DELETE /api/tickets/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.ticket.delete({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
