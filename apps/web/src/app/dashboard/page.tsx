import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FiShare2, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaWhatsapp } from "react-icons/fa";
import type { IconType } from "react-icons";
import AppShell from "@/components/layout/AppShell";
import DashboardCards from "./DashboardCards";

async function apiGet(path: string, token: string) {
  try {
    const res = await fetch(`${process.env.API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const PROVIDER_ICON: Record<string, { Icon: IconType; color: string }> = {
  facebook: { Icon: FaFacebookF, color: "#1877F2" },
  instagram: { Icon: FaInstagram, color: "#E4405F" },
  linkedin: { Icon: FaLinkedinIn, color: "#0A66C2" },
  whatsapp: { Icon: FaWhatsapp, color: "#25D366" },
};

const TYPE_LABEL: Record<string, string> = {
  page: "Facebook Page",
  instagram: "Instagram",
  ad_account: "Ad account",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

type Profile = {
  id: string;
  provider: string;
  type: string;
  name: string | null;
  picture: string | null;
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userInfo = await apiGet("/api/auth/me", session.accessToken);
  if (userInfo && !userInfo.onboarding_done) redirect("/onboarding");

  const profiles: Profile[] = (await apiGet("/api/integrations/profiles", session.accessToken)) ?? [];

  return (
    <AppShell user={{ name: session.user?.name, role: session.user?.role }} token={session.accessToken}>
      <div style={{ maxWidth: 1080 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--fg-display)", marginBottom: 6, letterSpacing: "-0.02em" }}>
          {greeting()}, {(session.user?.name ?? "there").split(" ")[0]}
        </h1>
        <p style={{ fontSize: 14, color: "var(--fg-muted)", marginBottom: 28 }}>
          Here&apos;s what&apos;s happening with your leads today.
        </p>

        {/* Role-aware stat cards */}
        <DashboardCards token={session.accessToken} />

        {/* Connection state — synced with installed profiles */}
        {profiles.length === 0 ? (
          <div
            style={{
              background: "var(--bg-elevated)", borderRadius: "var(--radius-4)",
              border: "1px solid var(--border-hairline)", padding: 28, textAlign: "center",
            }}
          >
            <div style={{ color: "var(--accent)", display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <FiShare2 size={30} />
            </div>
            <p style={{ fontWeight: 600, color: "var(--fg)", marginBottom: 6 }}>
              Connect a social profile to get started
            </p>
            <p style={{ fontSize: 13, color: "var(--fg-faint)", marginBottom: 20 }}>
              Once connected, leads and activity will appear here automatically.
            </p>
            <a
              href="/integrations"
              style={{
                display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px",
                borderRadius: "var(--radius-2)", background: "var(--accent)", color: "var(--fg-onaccent)",
                fontWeight: 600, fontSize: 13, textDecoration: "none",
              }}
            >
              Go to Social Profiles <FiArrowRight size={15} />
            </a>
          </div>
        ) : (
          <div
            style={{
              background: "var(--bg-elevated)", borderRadius: "var(--radius-4)",
              border: "1px solid var(--border-hairline)", overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 18px", borderBottom: "1px solid var(--border-hairline)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FiCheckCircle size={16} style={{ color: "var(--secondary)" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>
                  {profiles.length} connected {profiles.length === 1 ? "profile" : "profiles"}
                </span>
              </div>
              <a href="/integrations" style={{ fontSize: 13, color: "var(--accent-text)", fontWeight: 600, textDecoration: "none" }}>
                Manage →
              </a>
            </div>
            <div style={{ padding: 8 }}>
              {profiles.map((p) => {
                const meta = PROVIDER_ICON[p.provider];
                const Icon = meta?.Icon;
                return (
                  <a
                    key={p.id}
                    href={`/integrations/profiles/${p.id}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px",
                      borderRadius: "var(--radius-2)", textDecoration: "none",
                    }}
                  >
                    <span style={{ position: "relative", flexShrink: 0 }}>
                      {p.picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.picture} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <span style={{
                          width: 36, height: 36, borderRadius: "50%", background: "var(--bg-soft)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "var(--fg-faint)", fontWeight: 600,
                        }}>
                          {(p.name ?? "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                      {Icon && (
                        <span style={{
                          position: "absolute", bottom: -2, right: -2, width: 16, height: 16,
                          borderRadius: "50%", background: meta.color, color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 8, border: "2px solid var(--bg-elevated)",
                        }}>
                          <Icon />
                        </span>
                      )}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-faint)" }}>{TYPE_LABEL[p.type] ?? p.type}</div>
                    </div>
                    <FiArrowRight size={15} style={{ color: "var(--fg-faint)" }} />
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
