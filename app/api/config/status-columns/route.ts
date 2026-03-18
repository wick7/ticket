import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

const DEFAULT_COLUMNS = [
  { name: "To Do",       key: "todo",        color: "#6b7280", order: 0 },
  { name: "In Progress", key: "in_progress",  color: "#3b82f6", order: 1 },
  { name: "Blocked",     key: "blocked",      color: "#ef4444", order: 2 },
  { name: "Completed",   key: "completed",    color: "#22c55e", order: 3 },
];

export async function GET(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let columns = await prisma.statusColumn.findMany({
    where: { userId },
    orderBy: { order: "asc" },
  });

  if (columns.length === 0) {
    await prisma.statusColumn.createMany({
      data: DEFAULT_COLUMNS.map((c) => ({ ...c, userId })),
    });
    columns = await prisma.statusColumn.findMany({
      where: { userId },
      orderBy: { order: "asc" },
    });
  }

  return NextResponse.json(columns);
}

export async function POST(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = await prisma.statusColumn.count({ where: { userId } });
  if (count >= 4) {
    return NextResponse.json({ error: "Maximum 4 columns allowed" }, { status: 400 });
  }

  const { name, color, key } = await request.json() as { name?: string; color?: string; key?: string };
  if (!name?.trim() || !key?.trim()) {
    return NextResponse.json({ error: "name and key are required" }, { status: 400 });
  }

  const column = await prisma.statusColumn.create({
    data: { userId, name: name.trim(), color: color ?? "#6b7280", key: key.trim(), order: count },
  });

  return NextResponse.json(column, { status: 201 });
}
