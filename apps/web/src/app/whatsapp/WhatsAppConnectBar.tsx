"use client";

import { useEffect, useState } from "react";
import { FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { api, type WaConnection } from "@/lib/api-client";

const WA_GREEN = "#25D366";

export default function WhatsAppConnectBar({
  token,
  role,
}: {
  token: string;
  role?: string | null;
}) {
  const isAdmin = role === "company_admin";
  const [conn, setConn] = useState<WaConnection | null>(null);
  const [open, setOpen] = useState(false);
  const [pnid, setPnid] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.whatsapp.connection(token).then(setConn).catch(() => setConn({ connected: false, phone: null, phone_number_id: null, name: null }));
  }, [token]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.whatsapp.connectManual(token, {
        phone_number_id: pnid.trim(),
        access_token: accessToken.trim(),
      });
      setConn(result);
      setOpen(false);
      setAccessToken("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message.replace(/^API \d+:\s*/, "") : "Failed to connect");
    } finally {
      setBusy(false);
    }
  }

  const connected = conn?.connected;

  return (
    <div style={{ maxWidth: 1080, marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          borderRadius: "var(--radius-4)",
          border: "1px solid var(--border-hairline)",
          background: connected ? "rgba(37,211,102,0.08)" : "var(--bg-elevated)",
        }}
      >
        {connected ? (
          <FiCheckCircle style={{ color: WA_GREEN, flexShrink: 0 }} size={18} />
        ) : (
          <FiAlertCircle style={{ color: "var(--fg-faint)", flexShrink: 0 }} size={18} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg)" }}>
            {connected ? `Connected — ${conn?.name ?? conn?.phone ?? "WhatsApp number"}` : "WhatsApp number not connected"}
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
            {connected
              ? "Incoming customer messages will appear below."
              : isAdmin
              ? "Paste your WhatsApp Phone number ID + access token to start receiving messages."
              : "Ask your admin to connect the WhatsApp number."}
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: "7px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--fg)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {open ? "Cancel" : connected ? "Update" : "Connect"}
          </button>
        )}
      </div>

      {isAdmin && open && (
        <div
          style={{
            marginTop: 8,
            padding: 16,
            borderRadius: "var(--radius-4)",
            border: "1px solid var(--border-hairline)",
            background: "var(--bg-elevated)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-muted)" }}>
            Phone number ID
            <input
              value={pnid}
              onChange={(e) => setPnid(e.target.value)}
              placeholder="e.g. 123456789012345"
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-muted)" }}>
            Access token
            <input
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Temporary or permanent token"
              type="password"
              style={inputStyle}
            />
          </label>
          <div style={{ fontSize: 11.5, color: "var(--fg-faint)" }}>
            Both are on the Meta dashboard → WhatsApp → <strong>API Setup</strong> page.
          </div>
          {error && <div style={{ fontSize: 12.5, color: "#c0392b" }}>{error}</div>}
          <div>
            <button
              onClick={submit}
              disabled={busy || !pnid.trim() || !accessToken.trim()}
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                padding: "9px 18px",
                borderRadius: 8,
                border: "none",
                background: busy ? "var(--accent-soft)" : WA_GREEN,
                color: "#fff",
                cursor: busy ? "wait" : "pointer",
                opacity: !pnid.trim() || !accessToken.trim() ? 0.6 : 1,
              }}
            >
              {busy ? "Connecting…" : "Connect number"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 5,
  padding: "9px 11px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--fg)",
  fontSize: 13.5,
  fontWeight: 400,
  fontFamily: "var(--font-sans)",
};
