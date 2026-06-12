"use client";

import { useEffect, useState } from "react";
import { api, type AuditEntry } from "@/lib/api-client";

const ACTION_LABEL: Record<string, string> = {
  user_created: "User created",
  user_updated: "User updated",
  password_reset: "Password reset",
  password_changed: "Password changed",
  role_changed: "Role changed",
  manager_changed: "Manager changed",
  user_deactivated: "User deactivated",
  user_activated: "User activated",
  login: "Login",
};

export default function AuditClient({ token }: { token: string }) {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setRows(await api.audit.list(token, action ? { action } : undefined));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit log");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, action]);

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--fg-display)", letterSpacing: "-0.02em" }}>
        Audit Log
      </h1>
      <p style={{ fontSize: 14, color: "var(--fg-muted)", marginTop: 4, marginBottom: 20 }}>
        Every user-management action, newest first.
      </p>

      <select
        value={action}
        onChange={(e) => setAction(e.target.value)}
        style={{
          padding: "8px 12px",
          borderRadius: "var(--radius-2)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-hairline)",
          color: "var(--fg)",
          fontSize: 13,
          marginBottom: 16,
        }}
      >
        <option value="">All actions</option>
        {Object.entries(ACTION_LABEL).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>

      {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}

      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-4)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-soft, #f7f7f7)", textAlign: "left" }}>
              {["Action", "Actor", "Target", "When"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", color: "var(--fg-faint)", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "var(--fg-faint)" }}>
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "var(--fg-faint)" }}>
                  No audit entries.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border-hairline)" }}>
                  <td style={{ padding: "11px 14px", fontWeight: 600, color: "var(--fg)" }}>
                    {ACTION_LABEL[r.action] ?? r.action}
                  </td>
                  <td style={{ padding: "11px 14px", color: "var(--fg-muted)" }}>{r.actor ?? "—"}</td>
                  <td style={{ padding: "11px 14px", color: "var(--fg-muted)" }}>{r.target ?? "—"}</td>
                  <td style={{ padding: "11px 14px", color: "var(--fg-faint)" }}>
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
