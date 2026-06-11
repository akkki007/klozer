import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import SocialProfiles from "./SocialProfiles";

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const firstName = (session.user?.name ?? "there").split(" ")[0];

  return (
    <AppShell user={{ name: session.user?.name, role: session.user?.role }}>
      <div style={{ maxWidth: 1080 }}>
        <SocialProfiles token={session.accessToken} firstName={firstName} />
      </div>
    </AppShell>
  );
}
