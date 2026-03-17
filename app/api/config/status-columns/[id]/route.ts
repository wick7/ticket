import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const column = await prisma.statusColumn.findUnique({ where: { id } });
  if (!column || column.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { name, color } = await request.json() as { name?: string; color?: string };
  const updated = await prisma.statusColumn.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(color !== undefined ? { color } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const column = await prisma.statusColumn.findUnique({ where: { id } });
  if (!column || column.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const count = await prisma.statusColumn.count({ where: { userId } });
  if (count <= 1) {
    return NextResponse.json({ error: "Cannot delete the last column" }, { status: 400 });
  }

  await prisma.statusColumn.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
