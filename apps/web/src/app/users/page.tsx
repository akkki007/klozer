import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  // Only company_admin and head can manage users.
  const role = session.user?.role ?? "employee";
  if (role !== "company_admin" && role !== "head") redirect("/dashboard");

  return (
    <AppShell user={{ name: session.user?.name, role }} token={session.accessToken}>
      <UsersClient token={session.accessToken} role={role} />
    </AppShell>
  );
}
