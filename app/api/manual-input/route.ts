import { NextRequest, NextResponse } from "next/server";
import { classifyMessage } from "@/lib/ai/classifier";
import { prisma } from "@/lib/db";
import { generateTicketNumber } from "@/lib/tickets";

export async function POST(request: NextRequest) {
  try {
    const { message, senderName, company, category } = await request.json() as {
      message: string;
      senderName?: string;
      company?: string;
      category?: string;
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

      await prisma.ticket.updateMany({
        data: { orderIndex: { increment: 1 } },
      });

      const ticket = await prisma.ticket.create({
        data: {
          title: result.title!,
          body: result.body!,
          requester: result.requester ?? senderName ?? "Unknown",
          company: resolvedCompany,
          status: "todo",
          urgency: result.urgency ?? "medium",
          sourceService: "manual",
          category: category ?? "",
          ticketNumber,
          orderIndex: 0,
        },
      });
      tickets.push(ticket);
    }

    return NextResponse.json({ ticketable: true, tickets });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[manual-input] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
