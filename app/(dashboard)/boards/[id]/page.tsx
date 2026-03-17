import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { TicketBoard } from "@/components/tickets/TicketBoard";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const board = await prisma.board.findUnique({
    where: { id },
    include: { members: { select: { userId: true } } },
  });
  if (!board) notFound();

  // Check access: must be owner or member
  const isMember =
    board.userId === session.userId ||
    board.members.some((m) => m.userId === session.userId);
  if (!isMember) notFound();

  const filter = board.savedFilter as Record<string, string>;

  return <TicketBoard savedFilter={filter} title={board.name} boardId={id} />;
}
