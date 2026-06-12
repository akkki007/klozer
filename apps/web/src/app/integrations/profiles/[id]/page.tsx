import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import ProfileDetailView from "./ProfileDetail";

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const { id } = await params;

  return (
    <AppShell user={{ name: session.user?.name, role: session.user?.role }} token={session.accessToken}>
      <div style={{ maxWidth: 900 }}>
        <ProfileDetailView token={session.accessToken} id={id} />
      </div>
    </AppShell>
  );
}
