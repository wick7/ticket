import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  const firstBoard = await prisma.board.findFirst({
    where: { userId: session.userId },
    orderBy: { createdAt: "asc" },
  });

  if (firstBoard) redirect(`/boards/${firstBoard.id}`);
  redirect("/dashboard");
}
