import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import LinkedInClient from "./LinkedInClient";

export default async function LinkedInPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <AppShell user={{ name: session.user?.name, role: session.user?.role }} token={session.accessToken}>
      <LinkedInClient token={session.accessToken} role={session.user?.role} />
    </AppShell>
  );
}
