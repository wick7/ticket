import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { classifyMessage } from "@/lib/ai/classifier";
import { generateTicketNumber } from "@/lib/tickets";
import { fetchSlackMessages } from "@/lib/sources/slack";
import { fetchOutlookMessages } from "@/lib/sources/outlook";
import { fetchTeamsMessages } from "@/lib/sources/teams";
import { fetchGmailMessages } from "@/lib/sources/gmail";
import { requireAuth } from "@/lib/auth";

interface IngestResult {
  source: string;
  fetched: number;
  ticketsCreated: number;
  skipped: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results: IngestResult[] = [];

  // --- Slack ---
  try {
    const slackMessages = await fetchSlackMessages(userId);
    let created = 0;
    let skipped = 0;

    for (const msg of slackMessages) {
      const classifications = await classifyMessage(msg.text, {
        senderName: msg.senderName,
        company: msg.teamName,
        source: `Slack #${msg.channelName}`,
      });

      await prisma.seenMessage.create({ data: { messageId: msg.id, userId, service: "slack" } });

      let anyTicketable = false;
      for (const result of classifications) {
        if (!result.ticketable) continue;
        anyTicketable = true;
        await createTicket(userId, {
          title: result.title!,
          body: result.body!,
          requester: result.requester ?? msg.senderName,
          company: result.company ?? msg.teamName,
          urgency: result.urgency ?? "medium",
          sourceService: "slack",
          sourceRef: msg.id,
        });
        created++;
      }
      if (!anyTicketable) skipped++;
    }

    results.push({ source: "slack", fetched: slackMessages.length, ticketsCreated: created, skipped });
  } catch (err) {
    results.push({ source: "slack", fetched: 0, ticketsCreated: 0, skipped: 0, error: String(err) });
  }

  // --- Outlook ---
  try {
    const outlookMessages = await fetchOutlookMessages(userId);
    let created = 0;
    let skipped = 0;

    for (const msg of outlookMessages) {
      const text = `Subject: ${msg.subject}\n\n${msg.text}`;
      const classifications = await classifyMessage(text, {
        senderName: msg.senderName,
        source: "Outlook email",
      });

      await prisma.seenMessage.create({ data: { messageId: msg.id, userId, service: "outlook" } });

      let anyTicketable = false;
      for (const result of classifications) {
        if (!result.ticketable) continue;
        anyTicketable = true;
        await createTicket(userId, {
          title: result.title!,
          body: result.body!,
          requester: result.requester ?? msg.senderName,
          company: result.company ?? inferCompanyFromEmail(msg.senderEmail),
          urgency: result.urgency ?? "medium",
          sourceService: "outlook",
          sourceRef: msg.id,
        });
        created++;
      }
      if (!anyTicketable) skipped++;
    }

    results.push({ source: "outlook", fetched: outlookMessages.length, ticketsCreated: created, skipped });
  } catch (err) {
    results.push({ source: "outlook", fetched: 0, ticketsCreated: 0, skipped: 0, error: String(err) });
  }

  // --- Teams ---
  try {
    const teamsMessages = await fetchTeamsMessages(userId);
    let created = 0;
    let skipped = 0;

    for (const msg of teamsMessages) {
      const classifications = await classifyMessage(msg.text, {
        senderName: msg.senderName,
        source: `Teams chat: ${msg.chatName}`,
      });

      await prisma.seenMessage.create({ data: { messageId: msg.id, userId, service: "teams" } });

      let anyTicketable = false;
      for (const result of classifications) {
        if (!result.ticketable) continue;
        anyTicketable = true;
        await createTicket(userId, {
          title: result.title!,
          body: result.body!,
          requester: result.requester ?? msg.senderName,
          company: result.company ?? "Unknown",
          urgency: result.urgency ?? "medium",
          sourceService: "teams",
          sourceRef: msg.id,
        });
        created++;
      }
      if (!anyTicketable) skipped++;
    }

    results.push({ source: "teams", fetched: teamsMessages.length, ticketsCreated: created, skipped });
  } catch (err) {
    results.push({ source: "teams", fetched: 0, ticketsCreated: 0, skipped: 0, error: String(err) });
  }

  // --- Gmail ---
  try {
    const gmailMessages = await fetchGmailMessages(userId);
    let created = 0;
    let skipped = 0;

    for (const msg of gmailMessages) {
      const text = `Subject: ${msg.subject}\n\n${msg.text}`;
      const classifications = await classifyMessage(text, {
        senderName: msg.senderName,
        source: "Gmail",
      });

      await prisma.seenMessage.create({ data: { messageId: msg.id, userId, service: "gmail" } });

      let anyTicketable = false;
      for (const result of classifications) {
        if (!result.ticketable) continue;
        anyTicketable = true;
        await createTicket(userId, {
          title: result.title!,
          body: result.body!,
          requester: result.requester ?? msg.senderName,
          company: result.company ?? inferCompanyFromEmail(msg.senderEmail),
          urgency: result.urgency ?? "medium",
          sourceService: "gmail",
          sourceRef: msg.id,
        });
        created++;
      }
      if (!anyTicketable) skipped++;
    }

    results.push({ source: "gmail", fetched: gmailMessages.length, ticketsCreated: created, skipped });
  } catch (err) {
    results.push({ source: "gmail", fetched: 0, ticketsCreated: 0, skipped: 0, error: String(err) });
  }

  return NextResponse.json({ results });
}

async function createTicket(
  userId: string,
  data: {
    title: string;
    body: string;
    requester: string;
    company: string;
    urgency: string;
    sourceService: string;
    sourceRef: string;
  }
) {
  const ticketNumber = await generateTicketNumber(data.company);
  await prisma.ticket.updateMany({ where: { userId }, data: { orderIndex: { increment: 1 } } });
  await prisma.ticket.create({
    data: {
      userId,
      ...data,
      ticketNumber,
      status: "todo",
      orderIndex: 0,
    },
  });
}

function inferCompanyFromEmail(email: string): string {
  if (!email || !email.includes("@")) return "Unknown";
  const domain = email.split("@")[1];
  // Strip common personal email domains
  const personal = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];
  if (personal.includes(domain)) return "Unknown";
  // Capitalize the domain name part before the TLD
  return domain.split(".")[0].replace(/^\w/, (c) => c.toUpperCase());
}
