// Runs once when the Next.js server starts (Node.js runtime only).
// Schedules periodic background ingestion for all users.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const INTERVAL_MS =
    Math.max(1, parseInt(process.env.POLL_INTERVAL_MINUTES ?? "15", 10)) *
    60 *
    1000;

  console.log(
    `[TicketFlow] Background sync every ${INTERVAL_MS / 60000} minutes.`
  );

  async function runSync() {
    try {
      const { prisma } = await import("@/lib/db");
      const { classifyMessage } = await import("@/lib/ai/classifier");
      const { generateTicketNumber } = await import("@/lib/tickets");
      const { fetchSlackMessages } = await import("@/lib/sources/slack");
      const { fetchOutlookMessages } = await import("@/lib/sources/outlook");
      const { fetchTeamsMessages } = await import("@/lib/sources/teams");
      const { fetchGmailMessages } = await import("@/lib/sources/gmail");

      // Get all users who have at least one OAuth token
      const usersWithTokens = await prisma.oAuthToken.findMany({
        select: { userId: true },
        distinct: ["userId"],
      });

      let totalCreated = 0;

      for (const { userId } of usersWithTokens) {
        let userTotal = 0;

        async function createTicket(data: {
          title: string;
          body: string;
          requester: string;
          company: string;
          urgency: string;
          sourceService: string;
          sourceRef: string;
        }) {
          const ticketNumber = await generateTicketNumber(data.company);
          await prisma.ticket.updateMany({ where: { userId }, data: { orderIndex: { increment: 1 } } });
          await prisma.ticket.create({ data: { userId, ...data, ticketNumber, status: "todo", orderIndex: 0 } });
          userTotal++;
          totalCreated++;
        }

        function inferCompany(email: string): string {
          if (!email?.includes("@")) return "Unknown";
          const domain = email.split("@")[1];
          const personal = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];
          if (personal.includes(domain)) return "Unknown";
          return domain.split(".")[0].replace(/^\w/, (c: string) => c.toUpperCase());
        }

        // Slack
        try {
          const msgs = await fetchSlackMessages(userId);
          for (const msg of msgs) {
            const results = await classifyMessage(msg.text, {
              senderName: msg.senderName,
              company: msg.teamName,
              source: `Slack #${msg.channelName}`,
            });
            await prisma.seenMessage.create({ data: { messageId: msg.id, userId, service: "slack" } });
            for (const r of results) {
              if (!r.ticketable) continue;
              await createTicket({
                title: r.title!,
                body: r.body!,
                requester: r.requester ?? msg.senderName,
                company: r.company ?? msg.teamName,
                urgency: r.urgency ?? "medium",
                sourceService: "slack",
                sourceRef: msg.id,
              });
            }
          }
        } catch (e) {
          console.error(`[TicketFlow] Slack sync error for user ${userId}:`, e);
        }

        // Outlook
        try {
          const msgs = await fetchOutlookMessages(userId);
          for (const msg of msgs) {
            const results = await classifyMessage(
              `Subject: ${msg.subject}\n\n${msg.text}`,
              { senderName: msg.senderName, source: "Outlook email" }
            );
            await prisma.seenMessage.create({ data: { messageId: msg.id, userId, service: "outlook" } });
            for (const r of results) {
              if (!r.ticketable) continue;
              await createTicket({
                title: r.title!,
                body: r.body!,
                requester: r.requester ?? msg.senderName,
                company: r.company ?? inferCompany(msg.senderEmail),
                urgency: r.urgency ?? "medium",
                sourceService: "outlook",
                sourceRef: msg.id,
              });
            }
          }
        } catch (e) {
          console.error(`[TicketFlow] Outlook sync error for user ${userId}:`, e);
        }

        // Teams
        try {
          const msgs = await fetchTeamsMessages(userId);
          for (const msg of msgs) {
            const results = await classifyMessage(msg.text, {
              senderName: msg.senderName,
              source: `Teams chat: ${msg.chatName}`,
            });
            await prisma.seenMessage.create({ data: { messageId: msg.id, userId, service: "teams" } });
            for (const r of results) {
              if (!r.ticketable) continue;
              await createTicket({
                title: r.title!,
                body: r.body!,
                requester: r.requester ?? msg.senderName,
                company: r.company ?? "Unknown",
                urgency: r.urgency ?? "medium",
                sourceService: "teams",
                sourceRef: msg.id,
              });
            }
          }
        } catch (e) {
          console.error(`[TicketFlow] Teams sync error for user ${userId}:`, e);
        }

        // Gmail
        try {
          const msgs = await fetchGmailMessages(userId);
          for (const msg of msgs) {
            const results = await classifyMessage(
              `Subject: ${msg.subject}\n\n${msg.text}`,
              { senderName: msg.senderName, source: "Gmail" }
            );
            await prisma.seenMessage.create({ data: { messageId: msg.id, userId, service: "gmail" } });
            for (const r of results) {
              if (!r.ticketable) continue;
              await createTicket({
                title: r.title!,
                body: r.body!,
                requester: r.requester ?? msg.senderName,
                company: r.company ?? inferCompany(msg.senderEmail),
                urgency: r.urgency ?? "medium",
                sourceService: "gmail",
                sourceRef: msg.id,
              });
            }
          }
        } catch (e) {
          console.error(`[TicketFlow] Gmail sync error for user ${userId}:`, e);
        }

        if (userTotal > 0) {
          console.log(`[TicketFlow] User ${userId}: ${userTotal} new ticket${userTotal !== 1 ? "s" : ""}`);
        }
      }

      if (totalCreated > 0) {
        console.log(
          `[TicketFlow] Sync complete — ${totalCreated} new ticket${totalCreated !== 1 ? "s" : ""} created.`
        );
      }
    } catch (e) {
      console.error("[TicketFlow] Background sync failed:", e);
    }
  }

  // Schedule recurring sync
  setInterval(runSync, INTERVAL_MS);
}
