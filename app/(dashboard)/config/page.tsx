import { ConfigPage } from "@/components/ConfigPage";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Config() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <ConfigPage currentUserId={session.userId} />;
}
