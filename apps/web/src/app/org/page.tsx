import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import OrgChart from "../users/OrgChart";

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

export default async function OrgPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user?.role ?? "employee";
  const currentUserId = await fetchMeId(session.accessToken);

  const subtitle =
    role === "company_admin"
      ? "The full reporting hierarchy across your company."
      : role === "head"
      ? "Your team — you and the employees who report to you."
      : "Your reporting line — your head and your co-workers.";

  return (
    <AppShell user={{ name: session.user?.name, role }} token={session.accessToken}>
      <div style={{ maxWidth: 1200 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "var(--fg-display)",
            letterSpacing: "-0.02em",
          }}
        >
          Organization
        </h1>
        <p style={{ fontSize: 14, color: "var(--fg-muted)", marginTop: 4, marginBottom: 20 }}>
          {subtitle}
        </p>
        <OrgChart token={session.accessToken} currentUserId={currentUserId} />
      </div>
    </AppShell>
  );
}
