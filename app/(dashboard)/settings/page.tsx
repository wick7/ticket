import { redirect } from "next/navigation";

// Settings page is temporarily disabled.
// To re-enable: uncomment the imports and default export below, and remove the redirect.
//
// import { Suspense } from "react";
// import { SettingsPage } from "@/components/SettingsPage";
// import { getSession } from "@/lib/auth";
//
// export default async function Settings() {
//   const session = await getSession();
//   if (!session) redirect("/login");
//
//   return (
//     <Suspense>
//       <SettingsPage currentUserId={session.userId} />
//     </Suspense>
//   );
// }

export default function Settings() {
  redirect("/dashboard");
}
