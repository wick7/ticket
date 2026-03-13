import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const categories = await prisma.presetCategory.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json() as { name: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const category = await prisma.presetCategory.create({ data: { name: name.trim() } });
  return NextResponse.json(category);
}
