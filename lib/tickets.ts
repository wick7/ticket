import { prisma } from "@/lib/db";

/** Generate the next ticket number for a given company.
 *  Format: "{Company}-{N}" or "Ticket-{N}" when no company is set. */
export async function generateTicketNumber(company: string): Promise<string> {
  const prefix =
    company && company !== "Unknown" ? company : "Ticket";

  const existing = await prisma.ticket.findMany({
    where: { ticketNumber: { startsWith: `${prefix}-` } },
    select: { ticketNumber: true },
  });

  const nums = existing
    .map((t) => {
      const lastPart = t.ticketNumber.slice(prefix.length + 1); // everything after "{prefix}-"
      return parseInt(lastPart, 10);
    })
    .filter((n) => !isNaN(n));

  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${next}`;
}
