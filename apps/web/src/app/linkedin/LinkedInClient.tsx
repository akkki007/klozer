"use client";

import { useCallback, useEffect, useState } from "react";
import { FaLinkedinIn } from "react-icons/fa";
import { FiRefreshCw, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import {
  api,
  type LinkedInStatus,
  type LinkedInOrg,
  type LinkedInAnalytics,
} from "@/lib/api-client";

const LI_BLUE = "#0A66C2";

function extractError(e: unknown): { needsAccess: boolean; message: string } {
  const raw = e instanceof Error ? e.message : String(e);
  const needsAccess = raw.includes("needs_access") || raw.includes("409");
  return { needsAccess, message: raw.replace(/^API \d+:\s*/, "") };
}

export default function LinkedInClient({ token, role }: { token: string; role?: string | null }) {
  const isAdmin = role === "company_admin";
  const [status, setStatus] = useState<LinkedInStatus | null>(null);
  const [orgs, setOrgs] = useState<LinkedInOrg[] | null>(null);
  const [analytics, setAnalytics] = useState<LinkedInAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [accessPending, setAccessPending] = useState(false);

  const refresh = useCallback(async () => {
    const s = await api.linkedin.status(token).catch(() => null);
    setStatus(s);
    if (s?.connected && s.organization) {
      const a = await api.linkedin.analytics(token).catch((e) => {
        if (extractError(e).needsAccess) setAccessPending(true);
        return null;
      });
      setAnalytics(a);
    }
  }, [token]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // OAuth popup completion (shared bridge message).
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "oauth-complete" && e.data.provider === "linkedin") {
        setBusy(null);
        refresh();
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [refresh]);

  async function connect() {
    setBusy("connect");
    setNotice(null);
    try {
      const data = await api.integrations.connect(token, "linkedin");
      if (data.auth_url) {
        const w = window.open(data.auth_url, "leadmax-oauth", "width=640,height=720");
        if (!w) window.location.href = data.auth_url;
      } else {
        setNotice("LinkedIn isn't configured on the server.");
        setBusy(null);
      }
    } catch (e) {
      setNotice(extractError(e).message);
      setBusy(null);
    }
  }

  async function loadOrgs() {
    setBusy("orgs");
    setNotice(null);
    try {
      setOrgs(await api.linkedin.organizations(token));
    } catch (e) {
      const { needsAccess, message } = extractError(e);
      if (needsAccess) setAccessPending(true);
      else setNotice(message);
    } finally {
      setBusy(null);
    }
  }

  async function pickOrg(org: LinkedInOrg) {
    setBusy("select");
    try {
      setStatus(await api.linkedin.selectOrganization(token, org));
      setOrgs(null);
      refresh();
    } catch (e) {
      setNotice(extractError(e).message);
    } finally {
      setBusy(null);
    }
  }

  async function sync() {
    setBusy("sync");
    setNotice(null);
    try {
      const r = await api.linkedin.sync(token);
      setNotice(`Synced ${r.synced} new lead(s) (${r.seen} seen).`);
      refresh();
    } catch (e) {
      const { needsAccess, message } = extractError(e);
      if (needsAccess) setAccessPending(true);
      else setNotice(message);
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, color: "var(--fg-faint)" }}>Loading…</div>;
  }

  const org = status?.organization;

  return (
    <div style={{ maxWidth: 1000 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--fg-display)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <FaLinkedinIn style={{ color: LI_BLUE }} /> LinkedIn
        </h1>
        <p style={{ fontSize: 14, color: "var(--fg-muted)", marginTop: 4 }}>
          Sync Lead Gen Form leads and track campaign performance.
        </p>
      </header>

      {accessPending && (
        <Banner
          icon={<FiAlertCircle />}
          tone="warn"
          title="LinkedIn access pending approval"
          body="Your Lead Sync / Advertising API product requests are still under LinkedIn review. Connecting and syncing will work automatically once they're approved."
        />
      )}
      {notice && (
        <Banner icon={<FiCheckCircle />} tone="info" title={notice} />
      )}

      {/* Not configured */}
      {status && !status.configured && (
        <Banner icon={<FiAlertCircle />} tone="warn" title="LinkedIn isn't configured on the server."
          body="Add LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to the API .env." />
      )}

      {/* Not connected */}
      {status?.configured && !status.connected && (
        <Card>
          <Row>
            <FiAlertCircle style={{ color: "var(--fg-faint)" }} size={18} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: "var(--fg)" }}>LinkedIn not connected</strong>
              <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>
                {isAdmin ? "Connect your LinkedIn account to select a Page." : "Ask your admin to connect LinkedIn."}
              </div>
            </div>
            {isAdmin && <Btn onClick={connect} busy={busy === "connect"}>Connect LinkedIn</Btn>}
          </Row>
        </Card>
      )}

      {/* Connected, no org selected */}
      {status?.connected && !org && (
        <Card>
          <Row>
            <FiCheckCircle style={{ color: LI_BLUE }} size={18} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: "var(--fg)" }}>Connected</strong>
              <div style={{ fontSize: 13, color: "var(--fg-muted)" }}>Select the Company Page to sync from.</div>
            </div>
            {isAdmin && <Btn onClick={loadOrgs} busy={busy === "orgs"}>Choose Page</Btn>}
          </Row>
          {orgs && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {orgs.length === 0 && <div style={{ fontSize: 13, color: "var(--fg-faint)" }}>No admin Pages found on this account.</div>}
              {orgs.map((o) => (
                <button key={o.urn} onClick={() => pickOrg(o)} disabled={busy === "select"}
                  style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border-hairline)", background: "var(--bg)", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, color: "var(--fg)", fontSize: 13.5 }}>{o.name}</span>
                  <span style={{ fontSize: 12, color: "var(--fg-faint)" }}>{o.followers != null ? `${o.followers.toLocaleString()} followers` : ""}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Org selected — dashboard */}
      {org && (
        <>
          <Card>
            <Row>
              <span style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(10,102,194,0.12)", color: LI_BLUE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                <FaLinkedinIn />
              </span>
              <div style={{ flex: 1 }}>
                <strong style={{ color: "var(--fg)" }}>{org.name}</strong>
                <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                  {org.followers != null ? `${org.followers.toLocaleString()} followers` : ""}
                  {org.website ? ` · ${org.website}` : ""}
                  {` · ${status?.lead_count ?? 0} leads synced`}
                </div>
              </div>
              {isAdmin && (
                <Btn onClick={sync} busy={busy === "sync"}>
                  <FiRefreshCw size={14} style={{ marginRight: 6 }} /> Sync leads
                </Btn>
              )}
            </Row>
          </Card>

          {/* Campaign analytics */}
          <div style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", margin: "0 0 10px" }}>Campaign performance</h2>
            {!analytics ? (
              <div style={{ fontSize: 13, color: "var(--fg-faint)" }}>
                {accessPending ? "Analytics available once API access is approved." : "No campaign data yet."}
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 16 }}>
                  <Stat label="Impressions" value={analytics.totals.impressions.toLocaleString()} />
                  <Stat label="Clicks" value={analytics.totals.clicks.toLocaleString()} />
                  <Stat label="CTR" value={`${analytics.totals.ctr}%`} />
                  <Stat label="CPC" value={`₹${analytics.totals.cpc}`} />
                  <Stat label="CPL" value={`₹${analytics.totals.cpl}`} />
                  <Stat label="Leads" value={analytics.totals.leads.toLocaleString()} />
                </div>
                <div style={{ border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-4)", overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.8fr 0.8fr 0.8fr", padding: "9px 12px", background: "var(--bg-soft)", fontSize: 11, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    <span>Campaign</span><span>Impr.</span><span>Clicks</span><span>CTR</span><span>CPL</span><span>Leads</span>
                  </div>
                  {analytics.campaigns.length === 0 && <div style={{ padding: 16, fontSize: 13, color: "var(--fg-faint)" }}>No campaigns.</div>}
                  {analytics.campaigns.map((c) => (
                    <div key={c.campaign_id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.8fr 0.8fr 0.8fr", padding: "9px 12px", fontSize: 12.5, color: "var(--fg)", borderTop: "1px solid var(--border-hairline)" }}>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      <span>{c.impressions.toLocaleString()}</span>
                      <span>{c.clicks.toLocaleString()}</span>
                      <span>{c.ctr}%</span>
                      <span>₹{c.cpl}</span>
                      <span>{c.leads}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 16, borderRadius: "var(--radius-4)", border: "1px solid var(--border-hairline)", background: "var(--bg-elevated)", marginBottom: 12 }}>
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 12 }}>{children}</div>;
}
function Btn({ children, onClick, busy }: { children: React.ReactNode; onClick: () => void; busy?: boolean }) {
  return (
    <button onClick={onClick} disabled={busy}
      style={{ display: "inline-flex", alignItems: "center", fontSize: 13.5, fontWeight: 600, padding: "8px 16px", borderRadius: 8, border: "none", background: busy ? "var(--accent-soft)" : LI_BLUE, color: "#fff", cursor: busy ? "wait" : "pointer", whiteSpace: "nowrap" }}>
      {busy ? "Working…" : children}
    </button>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "14px 16px", borderRadius: "var(--radius-4)", border: "1px solid var(--border-hairline)", background: "var(--bg-elevated)" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--fg-display)" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--fg-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}
function Banner({ icon, title, body, tone }: { icon: React.ReactNode; title: string; body?: string; tone: "warn" | "info" }) {
  const bg = tone === "warn" ? "rgba(245,158,11,0.10)" : "rgba(10,102,194,0.08)";
  const color = tone === "warn" ? "#B45309" : LI_BLUE;
  return (
    <div style={{ display: "flex", gap: 10, padding: "12px 14px", borderRadius: "var(--radius-4)", background: bg, marginBottom: 12 }}>
      <span style={{ color, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg)" }}>{title}</div>
        {body && <div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 2 }}>{body}</div>}
      </div>
    </div>
  );
}
