"use client";

import { useEffect, useState, useCallback } from "react";
import { api, type ManagedUser, type Credentials } from "@/lib/api-client";
import CreateUserForm from "./CreateUserForm";
import CredentialModal from "./CredentialModal";

const ROLE_LABEL: Record<string, string> = {
  company_admin: "Company Admin",
  head: "Head",
  employee: "Employee",
};

export default function UsersClient({ token, role }: { token: string; role: string }) {
  const isAdmin = role === "company_admin";
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [creating, setCreating] = useState<null | "head" | "employee">(null);
  const [creds, setCreds] = useState<Credentials | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      setUsers(await api.users.list(token, params));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [token, roleFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const heads = users.filter((u) => u.role === "head");

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message.replace(/^API \d+:\s*/, "") : "Action failed");
    }
  }

  async function resetPw(u: ManagedUser) {
    if (!confirm(`Reset password for ${u.full_name}? A new temporary password will be issued.`)) return;
    try {
      const c = await api.users.resetPassword(token, u.id);
      setCreds(c);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message.replace(/^API \d+:\s*/, "") : "Reset failed");
    }
  }

  async function changeManager(u: ManagedUser) {
    const options = heads.filter((h) => h.id !== u.id);
    const choice = prompt(
      `Enter the new manager's employee code (or blank to detach).\nAvailable heads:\n` +
        options.map((h) => `${h.employee_code ?? h.id} — ${h.full_name}`).join("\n")
    );
    if (choice === null) return;
    const target = options.find((h) => h.employee_code === choice.trim());
    if (choice.trim() && !target) {
      alert("No head matched that code.");
      return;
    }
    await act(() => api.users.changeManager(token, u.id, target ? target.id : null));
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--fg-display)", letterSpacing: "-0.02em" }}>
            User Management
          </h1>
          <p style={{ fontSize: 14, color: "var(--fg-muted)", marginTop: 4 }}>
            {isAdmin ? "Manage heads and employees across your company." : "Manage your team."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {isAdmin && (
            <button onClick={() => setCreating("head")} style={btnPrimary}>
              + Add Head
            </button>
          )}
          <button onClick={() => setCreating("employee")} style={btnPrimary}>
            + Add Employee
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={filterStyle}>
          <option value="">All roles</option>
          <option value="head">Head</option>
          <option value="employee">Employee</option>
          {isAdmin && <option value="company_admin">Company Admin</option>}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={filterStyle}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p>}

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
              {["Name", "Code", "Role", "Department", "Status", "Actions"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", color: "var(--fg-faint)", fontWeight: 600 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--fg-faint)" }}>
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--fg-faint)" }}>
                  No users yet.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} style={{ borderTop: "1px solid var(--border-hairline)" }}>
                  <td style={{ padding: "11px 14px" }}>
                    <div style={{ fontWeight: 600, color: "var(--fg)" }}>{u.full_name}</div>
                    <div style={{ fontSize: 11, color: "var(--fg-faint)" }}>{u.email}</div>
                  </td>
                  <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono, monospace)", color: "var(--fg-muted)" }}>
                    {u.employee_code ?? "—"}
                  </td>
                  <td style={{ padding: "11px 14px" }}>{ROLE_LABEL[u.role] ?? u.role}</td>
                  <td style={{ padding: "11px 14px", color: "var(--fg-muted)" }}>{u.department ?? "—"}</td>
                  <td style={{ padding: "11px 14px" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: u.status === "active" ? "rgba(1,126,132,0.12)" : "rgba(148,148,148,0.15)",
                        color: u.status === "active" ? "var(--secondary, #017E84)" : "var(--fg-faint)",
                      }}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: "11px 14px" }}>
                    {u.role !== "company_admin" && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {isAdmin && (
                          <button onClick={() => resetPw(u)} style={linkBtn}>
                            Reset PW
                          </button>
                        )}
                        {isAdmin && u.role === "employee" && (
                          <button onClick={() => changeManager(u)} style={linkBtn}>
                            Manager
                          </button>
                        )}
                        {isAdmin &&
                          (u.status === "active" ? (
                            <button onClick={() => act(() => api.users.deactivate(token, u.id))} style={linkBtnDanger}>
                              Deactivate
                            </button>
                          ) : (
                            <button onClick={() => act(() => api.users.activate(token, u.id))} style={linkBtn}>
                              Activate
                            </button>
                          ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateUserForm
          token={token}
          kind={creating}
          heads={heads}
          onClose={() => setCreating(null)}
          onCreated={(c) => {
            setCreating(null);
            setCreds(c);
            load();
          }}
        />
      )}
      {creds && <CredentialModal creds={creds} onClose={() => setCreds(null)} />}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: "var(--radius-2)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  background: "var(--accent)",
  color: "var(--fg-onaccent, #fff)",
  border: "1px solid var(--accent)",
};
const filterStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: "var(--radius-2)",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border-hairline)",
  color: "var(--fg)",
  fontSize: 13,
};
const linkBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--accent-text, #714B67)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
};
const linkBtnDanger: React.CSSProperties = { ...linkBtn, color: "#dc2626" };
