import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import WhatsAppInbox from "./WhatsAppInbox";
import WhatsAppConnectBar from "./WhatsAppConnectBar";

export default async function WhatsAppPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <AppShell user={{ name: session.user?.name, role: session.user?.role }} token={session.accessToken}>
      <WhatsAppConnectBar token={session.accessToken} role={session.user?.role} />
      <WhatsAppInbox token={session.accessToken} />
    </AppShell>
  );
}
