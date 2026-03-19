import { NextRequest, NextResponse } from "next/server";
import { classifyMessage } from "@/lib/ai/classifier";
import { prisma } from "@/lib/db";
import { generateTicketNumber } from "@/lib/tickets";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { message, senderName, company, category, boardId } = await request.json() as {
      message: string;
      senderName?: string;
      company?: string;
      category?: string;
      boardId?: string;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const results = await classifyMessage(message, {
      senderName,
      company,
      source: "manual",
    });

    const ticketable = results.filter((r) => r.ticketable);

    if (ticketable.length === 0) {
      return NextResponse.json({ ticketable: false, reasoning: results[0]?.reasoning });
    }

    const tickets = [];
    for (const result of ticketable) {
      const resolvedCompany = result.company ?? company ?? "Unknown";
      const ticketNumber = await generateTicketNumber(resolvedCompany);

      // Ensure the company exists in presets so it appears in all dropdowns
      if (resolvedCompany && resolvedCompany !== "Unknown") {
        await prisma.presetCompany.upsert({
          where: { name_userId: { name: resolvedCompany, userId } },
          update: {},
          create: { name: resolvedCompany, userId },
        });
      }

      // Ensure the category exists in presets
      const resolvedCategory = (result.category ?? category)?.trim();
      if (resolvedCategory) {
        await prisma.presetCategory.upsert({
          where: { name_userId: { name: resolvedCategory, userId } },
          update: {},
          create: { name: resolvedCategory, userId },
        });
      }

      await prisma.ticket.updateMany({
        where: { userId },
        data: { orderIndex: { increment: 1 } },
      });

      const ticket = await prisma.ticket.create({
        data: {
          userId,
          title: result.title!,
          body: result.body!,
          requester: result.requester ?? senderName ?? "Unknown",
          company: resolvedCompany,
          status: "todo",
          urgency: result.urgency ?? "medium",
          sourceService: "ai",
          category: category ?? "",
          ticketNumber,
          orderIndex: 0,
        },
      });

      // Link to board if one was provided
      if (boardId) {
        const board = await prisma.board.findUnique({
          where: { id: boardId },
          select: { userId: true },
        });
        if (board && board.userId === userId) {
          await prisma.boardTicket.create({
            data: { boardId, ticketId: ticket.id, orderIndex: 0 },
          });
        }
      }

      tickets.push(ticket);
    }

    return NextResponse.json({ ticketable: true, tickets });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[manual-input] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
