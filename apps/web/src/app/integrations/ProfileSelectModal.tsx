"use client";

import { useEffect, useMemo, useState } from "react";
import {
  api,
  type AssetDiscovery,
  type DiscoveredAsset,
  type InstalledProfile,
} from "@/lib/api-client";

const GROUPS: { key: keyof Omit<AssetDiscovery, "provider">; label: string }[] = [
  { key: "pages", label: "Facebook Pages" },
  { key: "instagram", label: "Instagram accounts" },
  { key: "ad_accounts", label: "Ad accounts" },
];

export default function ProfileSelectModal({
  token,
  provider,
  installedIds,
  onClose,
  onInstalled,
}: {
  token: string;
  provider: string;
  installedIds: Set<string>;
  onClose: () => void;
  onInstalled: (profiles: InstalledProfile[]) => void;
}) {
  const [assets, setAssets] = useState<AssetDiscovery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    api.integrations
      .assets(token, provider)
      .then((data) => {
        setAssets(data);
        // Pre-select everything not already installed.
        const next = new Set<string>();
        for (const g of GROUPS) for (const a of data[g.key]) if (!installedIds.has(a.id)) next.add(a.id);
        setSelected(next);
      })
      .catch((e) => setError(e.message ?? "Failed to load profiles"))
      .finally(() => setLoading(false));
  }, [token, provider, installedIds]);

  const allAssets = useMemo<DiscoveredAsset[]>(
    () => (assets ? [...assets.pages, ...assets.instagram, ...assets.ad_accounts] : []),
    [assets]
  );

  const total = allAssets.length;
  const selectableCount = allAssets.filter((a) => !installedIds.has(a.id)).length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleInstall() {
    const chosen = allAssets.filter((a) => selected.has(a.id) && !installedIds.has(a.id));
    if (chosen.length === 0) {
      onClose();
      return;
    }
    setInstalling(true);
    try {
      const profiles = await api.integrations.install(token, provider, chosen);
      onInstalled(profiles);
    } catch (e: any) {
      setError(e.message ?? "Install failed");
      setInstalling(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,15,15,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-5)",
          boxShadow: "var(--shadow-3)",
          width: "100%",
          maxWidth: 520,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 22px 14px" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--fg-display)" }}>
            Choose profiles to install
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--fg-muted)" }}>
            We found everything this account can manage. Pick what you want to use in LeadMax.
          </p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 22px 8px" }}>
          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--fg-faint)", fontSize: 13 }}>
              Fetching your profiles…
            </div>
          ) : error ? (
            <div style={{ padding: "20px 0", color: "#dc2626", fontSize: 13 }}>{error}</div>
          ) : total === 0 ? (
            <div style={{ padding: "28px 4px", textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", marginBottom: 8 }}>
                No Pages found on this account
              </div>
              <p style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5, margin: "0 auto", maxWidth: 380 }}>
                We connected successfully, but this account doesn’t manage any
                Facebook&nbsp;Pages. A personal profile can’t be used — social
                marketing runs on Pages, Instagram&nbsp;Business accounts and ad
                accounts.
              </p>
              <p style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5, marginTop: 10 }}>
                Create a Page (you must be its admin), then reconnect.
              </p>
              <a
                href="https://www.facebook.com/pages/create"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: 14,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--accent)",
                  textDecoration: "none",
                }}
              >
                Create a Facebook Page ↗
              </a>
            </div>
          ) : (
            GROUPS.map((g) => {
              const items = assets![g.key];
              if (!items.length) return null;
              return (
                <div key={g.key} style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: "var(--fg-faint)",
                      margin: "10px 2px 8px",
                    }}
                  >
                    {g.label}
                  </div>
                  {items.map((a) => {
                    const already = installedIds.has(a.id);
                    const checked = already || selected.has(a.id);
                    return (
                      <label
                        key={a.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 12px",
                          borderRadius: "var(--radius-2)",
                          border: "1px solid var(--border-hairline)",
                          marginBottom: 8,
                          cursor: already ? "default" : "pointer",
                          background: checked && !already ? "rgba(113,75,103,0.06)" : "var(--bg-elevated)",
                          opacity: already ? 0.65 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={already}
                          onChange={() => toggle(a.id)}
                          style={{ accentColor: "var(--accent)", width: 16, height: 16 }}
                        />
                        {a.picture ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.picture}
                            alt=""
                            style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                          />
                        ) : (
                          <span
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: "var(--bg-soft)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--fg-faint)",
                            }}
                          >
                            {a.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              display: "block",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--fg)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {a.name}
                          </span>
                          {(a.username || a.category) && (
                            <span style={{ fontSize: 11, color: "var(--fg-faint)" }}>
                              {a.username ? `@${a.username}` : a.category}
                            </span>
                          )}
                        </span>
                        {already && (
                          <span style={{ fontSize: 11, color: "var(--secondary)", fontWeight: 600 }}>
                            Installed
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "14px 22px",
            borderTop: "1px solid var(--border-hairline)",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--fg-faint)" }}>
            {selectableCount === 0 && total > 0 ? "All profiles already installed" : `${selected.size} selected`}
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                fontSize: 13,
                fontWeight: 500,
                padding: "8px 14px",
                borderRadius: "var(--radius-2)",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--fg)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleInstall}
              disabled={installing || loading || selected.size === 0}
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: "var(--radius-2)",
                border: "none",
                background: "var(--accent)",
                color: "var(--fg-onaccent)",
                cursor: installing ? "wait" : "pointer",
                opacity: installing || selected.size === 0 ? 0.6 : 1,
              }}
            >
              {installing ? "Installing…" : `Install ${selected.size || ""}`.trim()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
