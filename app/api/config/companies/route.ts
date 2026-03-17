import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companies = await prisma.presetCompany.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(companies);
}

export async function POST(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await request.json() as { name: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const company = await prisma.presetCompany.create({
    data: { userId, name: name.trim() },
  });
  return NextResponse.json(company);
}
