// Runs once when the Next.js server starts (Node.js runtime only).
// Schedules periodic background ingestion while the app is running.
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

      let total = 0;

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
        await prisma.ticket.updateMany({ data: { orderIndex: { increment: 1 } } });
        await prisma.ticket.create({ data: { ...data, ticketNumber, status: "todo", orderIndex: 0 } });
        total++;
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
        const msgs = await fetchSlackMessages();
        for (const msg of msgs) {
          const results = await classifyMessage(msg.text, {
            senderName: msg.senderName,
            company: msg.teamName,
            source: `Slack #${msg.channelName}`,
          });
          await prisma.seenMessage.create({ data: { id: msg.id, service: "slack" } });
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
        console.error("[TicketFlow] Slack sync error:", e);
      }

      // Outlook
      try {
        const msgs = await fetchOutlookMessages();
        for (const msg of msgs) {
          const results = await classifyMessage(
            `Subject: ${msg.subject}\n\n${msg.text}`,
            { senderName: msg.senderName, source: "Outlook email" }
          );
          await prisma.seenMessage.create({ data: { id: msg.id, service: "outlook" } });
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
        console.error("[TicketFlow] Outlook sync error:", e);
      }

      // Teams
      try {
        const msgs = await fetchTeamsMessages();
        for (const msg of msgs) {
          const results = await classifyMessage(msg.text, {
            senderName: msg.senderName,
            source: `Teams chat: ${msg.chatName}`,
          });
          await prisma.seenMessage.create({ data: { id: msg.id, service: "teams" } });
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
        console.error("[TicketFlow] Teams sync error:", e);
      }

      if (total > 0) {
        console.log(
          `[TicketFlow] Sync complete — ${total} new ticket${total !== 1 ? "s" : ""} created.`
        );
      }
    } catch (e) {
      console.error("[TicketFlow] Background sync failed:", e);
    }
  }

  // Schedule recurring sync
  setInterval(runSync, INTERVAL_MS);
}
