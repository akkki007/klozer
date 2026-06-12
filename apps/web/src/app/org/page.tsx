import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import OrgTreeClient from "./OrgTreeClient";

export default async function OrgPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user?.role ?? "employee";
  if (role !== "company_admin" && role !== "head") redirect("/dashboard");

  return (
    <AppShell user={{ name: session.user?.name, role }} token={session.accessToken}>
      <OrgTreeClient token={session.accessToken} />
    </AppShell>
  );
}
