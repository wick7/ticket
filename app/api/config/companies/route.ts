import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const companies = await prisma.presetCompany.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json() as { name: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const company = await prisma.presetCompany.create({ data: { name: name.trim() } });
  return NextResponse.json(company);
}
