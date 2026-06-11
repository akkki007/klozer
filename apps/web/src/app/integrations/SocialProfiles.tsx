"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
  FaGoogle,
  FaPinterestP,
  FaWhatsapp,
} from "react-icons/fa";
import { FaXTwitter, FaTiktok } from "react-icons/fa6";
import { FiX, FiInfo } from "react-icons/fi";
import type { IconType } from "react-icons";
import { api, type InstalledProfile } from "@/lib/api-client";
import ProfileSelectModal from "./ProfileSelectModal";

type Network = {
  provider: string;
  label: string;
  Icon: IconType;
  color: string;
  functional: boolean;
};

// Left-hand catalog. Functional networks run the real OAuth flow; the rest are
// visual placeholders until their connectors ship.
const NETWORKS: Network[] = [
  { provider: "facebook", label: "Facebook Page", Icon: FaFacebookF, color: "#1877F2", functional: true },
  { provider: "instagram", label: "Instagram account", Icon: FaInstagram, color: "#E4405F", functional: true },
  { provider: "linkedin", label: "LinkedIn", Icon: FaLinkedinIn, color: "#0A66C2", functional: true },
  { provider: "whatsapp", label: "WhatsApp", Icon: FaWhatsapp, color: "#25D366", functional: true },
  { provider: "x", label: "X (Twitter)", Icon: FaXTwitter, color: "#000000", functional: false },
  { provider: "youtube", label: "YouTube channel", Icon: FaYoutube, color: "#FF0000", functional: false },
  { provider: "google_business", label: "Google Business", Icon: FaGoogle, color: "#4285F4", functional: false },
  { provider: "tiktok", label: "TikTok account", Icon: FaTiktok, color: "#000000", functional: false },
  { provider: "pinterest", label: "Pinterest profile", Icon: FaPinterestP, color: "#BD081C", functional: false },
];

const PROVIDER_META: Record<string, { label: string; Icon: IconType; color: string }> =
  Object.fromEntries(NETWORKS.map((n) => [n.provider, { label: n.label, Icon: n.Icon, color: n.color }]));

const TYPE_LABEL: Record<string, string> = {
  page: "Facebook Page",
  instagram: "Instagram",
  ad_account: "Ad account",
};

const MAX_PROFILES = 10;

export default function SocialProfiles({
  token,
  firstName,
}: {
  token: string;
  firstName: string;
}) {
  const [profiles, setProfiles] = useState<InstalledProfile[]>([]);
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [modalProvider, setModalProvider] = useState<string | null>(null);
  const router = useRouter();

  const refreshProfiles = useCallback(() => {
    return api.integrations.profiles(token).then(setProfiles);
  }, [token]);

  useEffect(() => {
    Promise.all([
      refreshProfiles(),
      api.integrations.list(token).then((list: any) => {
        const map: Record<string, boolean> = {};
        for (const i of list) map[i.provider] = i.configured;
        setConfigured(map);
      }),
    ]).finally(() => setLoading(false));
  }, [token, refreshProfiles]);

  // Listen for the OAuth popup bridge signalling completion.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "oauth-complete") return;
      setConnecting(null);
      const provider = e.data.provider as string;
      if (e.data.status === "connected") {
        refreshProfiles();
      } else {
        setModalProvider(provider);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refreshProfiles]);

  // Fallback for popup-blocked flow: full redirect lands back with ?phase=select.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("phase") === "select" && params.get("provider")) {
      setModalProvider(params.get("provider"));
      window.history.replaceState({}, "", "/integrations");
    }
  }, []);

  async function handleConnect(net: Network) {
    if (!net.functional) return;
    if (configured[net.provider] === false) {
      alert("This network isn't configured on the server yet (missing API credentials).");
      return;
    }
    setConnecting(net.provider);
    try {
      const data = await api.integrations.connect(token, net.provider);
      if (data.auth_url) {
        const w = 600;
        const h = 720;
        const left = window.screenX + (window.outerWidth - w) / 2;
        const top = window.screenY + (window.outerHeight - h) / 2;
        const popup = window.open(
          data.auth_url,
          "leadmax-oauth",
          `width=${w},height=${h},left=${left},top=${top}`
        );
        if (!popup) {
          // Popup blocked — fall back to a full-page redirect.
          window.location.href = data.auth_url;
        }
      } else {
        alert("This network uses a different setup flow that isn't wired up here yet.");
        setConnecting(null);
      }
    } catch (err: any) {
      alert(`Couldn't start connection: ${err.message ?? err}`);
      setConnecting(null);
    }
  }

  async function handleDisconnect(profile: InstalledProfile) {
    if (!confirm(`Disconnect "${profile.name}"?`)) return;
    await api.integrations.disconnectProfile(token, profile.id);
    setProfiles((prev) => prev.filter((p) => p.id !== profile.id));
  }

  return (
    <>
      {/* Greeting */}
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--fg-display)", margin: 0 }}>
          Nice to meet you, {firstName}!
        </h1>
        <p style={{ fontSize: 14, color: "var(--fg-muted)", marginTop: 6 }}>
          Connect your social profiles to publish, capture leads, and run campaigns from LeadMax.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 28,
          alignItems: "start",
        }}
      >
        {/* ── LEFT: network catalog ─────────────────────────────────── */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              background: "rgba(113,75,103,0.07)",
              border: "1px solid var(--accent-soft)",
              borderRadius: "var(--radius-4)",
              padding: "12px 14px",
              fontSize: 13,
              color: "var(--fg)",
              marginBottom: 18,
            }}
          >
            <FiInfo size={15} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
            <span>You can start using LeadMax once you’ve connected at least one social profile.</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            {NETWORKS.map((net) => {
              const isConnecting = connecting === net.provider;
              const disabled = !net.functional;
              return (
                <button
                  key={net.provider}
                  onClick={() => handleConnect(net)}
                  disabled={disabled || isConnecting}
                  title={disabled ? "Coming soon" : `Connect ${net.label}`}
                  style={{
                    position: "relative",
                    textAlign: "left",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-hairline)",
                    borderRadius: "var(--radius-4)",
                    boxShadow: "var(--shadow-1)",
                    padding: "16px 14px",
                    cursor: disabled ? "default" : isConnecting ? "wait" : "pointer",
                    opacity: disabled ? 0.55 : 1,
                    minHeight: 96,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    transition: "box-shadow .15s, transform .05s",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: net.color,
                      color: "#fff",
                      fontSize: 16,
                    }}
                  >
                    <net.Icon />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)", lineHeight: 1.3 }}>
                    {net.label}
                  </span>

                  {/* + or Soon affordance */}
                  <span
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      fontSize: disabled ? 10 : 18,
                      fontWeight: disabled ? 600 : 400,
                      color: disabled ? "var(--fg-faint)" : "var(--fg-muted)",
                      textTransform: disabled ? "uppercase" : "none",
                      letterSpacing: disabled ? 0.4 : 0,
                    }}
                  >
                    {disabled ? "Soon" : isConnecting ? "…" : "+"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── RIGHT: installed profiles ─────────────────────────────── */}
        <section
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-4)",
            boxShadow: "var(--shadow-1)",
            overflow: "hidden",
            position: "sticky",
            top: 24,
          }}
        >
          <div
            style={{
              padding: "16px 18px",
              borderBottom: "1px solid var(--border-hairline)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>
              Installed profiles
            </div>
            <div style={{ fontSize: 13, color: "var(--secondary)", fontWeight: 600, marginTop: 2 }}>
              {profiles.length}/{MAX_PROFILES} installed profile{profiles.length === 1 ? "" : "s"}
            </div>
          </div>

          <div style={{ padding: profiles.length ? 8 : 0 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--fg-faint)", fontSize: 13 }}>
                Loading…
              </div>
            ) : profiles.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>
                  No profiles yet — click <strong>+</strong> on a network to connect one.
                </div>
              </div>
            ) : (
              profiles.map((p) => {
                const meta = PROVIDER_META[p.provider];
                const Icon = meta?.Icon;
                return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/integrations/profiles/${p.id}`)}
                    title="View details"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 10px",
                      borderRadius: "var(--radius-2)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ position: "relative", flexShrink: 0 }}>
                      {p.picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.picture}
                          alt=""
                          style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover" }}
                        />
                      ) : (
                        <span
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            background: "var(--bg-soft)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--fg-faint)",
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          {(p.name ?? "?").charAt(0).toUpperCase()}
                        </span>
                      )}
                      {Icon && (
                        <span
                          aria-hidden
                          style={{
                            position: "absolute",
                            bottom: -2,
                            right: -2,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: meta.color,
                            color: "#fff",
                            fontSize: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "2px solid var(--bg-elevated)",
                          }}
                        >
                          <Icon />
                        </span>
                      )}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--fg)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--fg-faint)", marginTop: 1 }}>
                        {TYPE_LABEL[p.type] ?? p.type}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDisconnect(p);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        color: "var(--fg-faint)",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 6px",
                      }}
                      title="Disconnect"
                    >
                      <FiX size={15} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ padding: 14, borderTop: "1px solid var(--border-hairline)" }}>
            <button
              onClick={() => router.push("/dashboard")}
              disabled={profiles.length === 0}
              title={profiles.length === 0 ? "Connect at least one profile first" : "Continue"}
              style={{
                width: "100%",
                fontSize: 14,
                fontWeight: 600,
                padding: "11px 16px",
                borderRadius: "var(--radius-2)",
                border: "none",
                cursor: profiles.length === 0 ? "not-allowed" : "pointer",
                background: profiles.length === 0 ? "var(--accent-soft)" : "var(--accent)",
                color: "var(--fg-onaccent)",
                opacity: profiles.length === 0 ? 0.7 : 1,
                transition: "background .15s",
              }}
            >
              {profiles.length === 0
                ? "Connect a profile to continue"
                : "Let’s start using LeadMax →"}
            </button>
          </div>
        </section>
      </div>

      {modalProvider && (
        <ProfileSelectModal
          token={token}
          provider={modalProvider}
          installedIds={new Set(profiles.map((p) => p.account_id ?? ""))}
          onClose={() => setModalProvider(null)}
          onInstalled={(updated) => {
            setProfiles(updated);
            setModalProvider(null);
          }}
        />
      )}
    </>
  );
}
