import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import UsersClient from "./UsersClient";

async function fetchMeId(token: string): Promise<string | undefined> {
  try {
    const res = await fetch(`${process.env.API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    return (await res.json()).id as string;
  } catch {
    return undefined;
  }
}

export default async function UsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  // Only company_admin and head can manage users.
  const role = session.user?.role ?? "employee";
  if (role !== "company_admin" && role !== "head") redirect("/dashboard");

  const currentUserId = await fetchMeId(session.accessToken);

  return (
    <AppShell user={{ name: session.user?.name, role }} token={session.accessToken}>
      <UsersClient token={session.accessToken} role={role} currentUserId={currentUserId} />
    </AppShell>
  );
}
