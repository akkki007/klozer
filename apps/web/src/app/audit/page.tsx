import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import AuditClient from "./AuditClient";

export default async function AuditPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user?.role ?? "employee";
  if (role !== "company_admin") redirect("/dashboard");

  return (
    <AppShell user={{ name: session.user?.name, role }} token={session.accessToken}>
      <AuditClient token={session.accessToken} />
    </AppShell>
  );
}
