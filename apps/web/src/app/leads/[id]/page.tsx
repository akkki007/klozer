import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import LeadDetailClient from "./LeadDetailClient";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  return (
    <AppShell user={{ name: session.user?.name, role: session.user?.role }} token={session.accessToken}>
      <LeadDetailClient token={session.accessToken} leadId={id} role={session.user?.role ?? null} />
    </AppShell>
  );
}
