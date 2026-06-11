"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiExternalLink, FiTrash2, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaWhatsapp } from "react-icons/fa";
import type { IconType } from "react-icons";
import { api, type ProfileDetail } from "@/lib/api-client";

const PROVIDER_ICON: Record<string, { Icon: IconType; color: string; label: string }> = {
  facebook: { Icon: FaFacebookF, color: "#1877F2", label: "Facebook" },
  instagram: { Icon: FaInstagram, color: "#E4405F", label: "Instagram" },
  linkedin: { Icon: FaLinkedinIn, color: "#0A66C2", label: "LinkedIn" },
  whatsapp: { Icon: FaWhatsapp, color: "#25D366", label: "WhatsApp" },
};

const TYPE_LABEL: Record<string, string> = {
  page: "Facebook Page",
  instagram: "Instagram account",
  ad_account: "Ad account",
};

// Friendly labels for known live/meta fields
const FIELD_LABEL: Record<string, string> = {
  fan_count: "Followers",
  followers_count: "Followers",
  follows_count: "Following",
  media_count: "Posts",
  category: "Category",
  about: "About",
  biography: "Bio",
  link: "Link",
  website: "Website",
  username: "Username",
  verification_status: "Verification",
  account_status: "Account status",
  currency: "Currency",
  amount_spent: "Amount spent",
  balance: "Balance",
  business_name: "Business",
  timezone_name: "Timezone",
};

const TABS = ["Overview", "Permissions", "Details"] as const;
type Tab = (typeof TABS)[number];

function prettify(key: string) {
  return FIELD_LABEL[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 16, padding: "11px 0", borderBottom: "1px solid var(--border-hairline)" }}>
      <div style={{ width: 150, flexShrink: 0, fontSize: 13, color: "var(--fg-faint)" }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13, color: "var(--fg)", wordBreak: "break-word" }}>{children}</div>
    </div>
  );
}

export default function ProfileDetailView({ token, id }: { token: string; id: string }) {
  const router = useRouter();
  const [p, setP] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");

  useEffect(() => {
    api.integrations
      .profileDetail(token, id)
      .then(setP)
      .catch((e) => setError(e.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [token, id]);

  async function handleDisconnect() {
    if (!p || !confirm(`Disconnect "${p.name}"?`)) return;
    await api.integrations.disconnectProfile(token, p.id);
    router.push("/integrations");
  }

  if (loading) return <div style={{ padding: 40, color: "var(--fg-faint)", fontSize: 14 }}>Loading…</div>;
  if (error || !p)
    return (
      <div style={{ padding: 40, color: "#dc2626", fontSize: 14 }}>{error ?? "Profile not found"}</div>
    );

  const meta = PROVIDER_ICON[p.provider];
  const live = (p.live ?? {}) as Record<string, unknown>;
  const liveEntries = Object.entries(live).filter(([k]) => k !== "id" && k !== "picture_url");

  return (
    <>
      <button
        onClick={() => router.push("/integrations")}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 18,
          background: "transparent", border: "none", cursor: "pointer",
          color: "var(--fg-muted)", fontSize: 13, fontWeight: 500, padding: 0,
        }}
      >
        <FiArrowLeft size={15} /> Back to Social Profiles
      </button>

      {/* Header */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 16, marginBottom: 22,
          background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-4)", boxShadow: "var(--shadow-1)", padding: "18px 20px",
        }}
      >
        <span style={{ position: "relative", flexShrink: 0 }}>
          {p.picture || (live.picture_url as string) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(live.picture_url as string) || p.picture || ""}
              alt=""
              style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <span style={{
              width: 56, height: 56, borderRadius: "50%", background: "var(--bg-soft)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--fg-faint)", fontSize: 22, fontWeight: 600,
            }}>
              {(p.name ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
          {meta && (
            <span style={{
              position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: "50%",
              background: meta.color, color: "#fff", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 11, border: "2px solid var(--bg-elevated)",
            }}>
              <meta.Icon />
            </span>
          )}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--fg-display)", margin: 0 }}>{p.name}</h1>
          <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 3, display: "flex", gap: 8, alignItems: "center" }}>
            <span>{TYPE_LABEL[p.type] ?? p.type}</span>
            <span style={{ color: "var(--border)" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: p.status === "active" ? "var(--secondary)" : "var(--fg-faint)" }}>
              <FiCheckCircle size={13} /> {p.status}
            </span>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px",
            borderRadius: "var(--radius-2)", border: "1px solid rgba(239,68,68,0.3)",
            background: "transparent", color: "#dc2626", fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}
        >
          <FiTrash2 size={14} /> Disconnect
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-hairline)", marginBottom: 18 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "9px 14px", background: "transparent", border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: tab === t ? 600 : 500,
              color: tab === t ? "var(--accent-text)" : "var(--fg-muted)",
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Overview" && (
        <div>
          {p.live_error && (
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "var(--fg-muted)",
              background: "var(--bg-soft)", border: "1px solid var(--border-hairline)",
              borderRadius: "var(--radius-2)", padding: "10px 12px", marginBottom: 16,
            }}>
              <FiAlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>Couldn’t load live data from the provider (the connection still works). {p.live_error}</span>
            </div>
          )}
          <Row label="Name">{p.name}</Row>
          <Row label="Type">{TYPE_LABEL[p.type] ?? p.type}</Row>
          <Row label="Network">{meta?.label ?? p.provider}</Row>
          <Row label="Account ID"><code style={{ fontSize: 12 }}>{p.account_id}</code></Row>
          <Row label="Status">{p.status}</Row>
          {p.leadgen_subscribed !== null && (
            <Row label="Lead webhook">{p.leadgen_subscribed ? "Subscribed" : "Not subscribed"}</Row>
          )}
          {liveEntries.map(([k, v]) => (
            <Row key={k} label={prettify(k)}>
              {typeof v === "string" && /^https?:\/\//.test(v) ? (
                <a href={v} target="_blank" rel="noopener noreferrer"
                   style={{ color: "var(--accent-text)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {v} <FiExternalLink size={12} />
                </a>
              ) : (
                String(v)
              )}
            </Row>
          ))}
        </div>
      )}

      {tab === "Permissions" && (
        <div>
          <p style={{ fontSize: 13, color: "var(--fg-muted)", marginBottom: 14 }}>
            Permissions granted to LeadMax for this account ({p.scopes.length}).
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {p.scopes.length === 0 ? (
              <span style={{ fontSize: 13, color: "var(--fg-faint)" }}>No scopes recorded.</span>
            ) : (
              p.scopes.map((s) => (
                <span key={s} style={{
                  fontSize: 12, fontFamily: "ui-monospace, monospace", padding: "4px 10px",
                  borderRadius: 99, background: "var(--bg-soft)", border: "1px solid var(--border-hairline)",
                  color: "var(--fg)",
                }}>
                  {s}
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "Details" && (
        <div>
          <Row label="Connected">{p.created_at ? new Date(p.created_at).toLocaleString() : "—"}</Row>
          <Row label="Last updated">{p.updated_at ? new Date(p.updated_at).toLocaleString() : "—"}</Row>
          <Row label="Token expires">{p.expires_at ? new Date(p.expires_at).toLocaleString() : "Long-lived / n/a"}</Row>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--fg-faint)", marginBottom: 8 }}>
              Raw metadata
            </div>
            <pre style={{
              fontSize: 12, background: "var(--bg-soft)", border: "1px solid var(--border-hairline)",
              borderRadius: "var(--radius-2)", padding: 14, overflowX: "auto", color: "var(--fg)", margin: 0,
            }}>
              {JSON.stringify({ meta: p.meta, live: p.live }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}
