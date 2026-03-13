import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { TicketBoard } from "@/components/tickets/TicketBoard";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const board = await prisma.board.findUnique({ where: { id } });
  if (!board) notFound();

  const filter = board.savedFilter as Record<string, string>;

  return <TicketBoard savedFilter={filter} title={board.name} />;
}
