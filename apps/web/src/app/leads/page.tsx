import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import LeadsClient from "./LeadsClient";

export default async function LeadsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <AppShell user={{ name: session.user?.name, role: session.user?.role }} token={session.accessToken}>
      <LeadsClient token={session.accessToken} role={session.user?.role ?? null} />
    </AppShell>
  );
}
