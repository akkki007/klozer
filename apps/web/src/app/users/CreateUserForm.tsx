"use client";

import { useState } from "react";
import { api, type CreateUserBody, type Credentials, type ManagedUser } from "@/lib/api-client";

export default function CreateUserForm({
  token,
  kind,
  heads,
  onClose,
  onCreated,
}: {
  token: string;
  kind: "head" | "employee";
  heads: ManagedUser[]; // for admin selecting a manager when creating an employee
  onClose: () => void;
  onCreated: (creds: Credentials) => void;
}) {
  const [form, setForm] = useState<CreateUserBody>({ full_name: "", email: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set<K extends keyof CreateUserBody>(key: K, value: CreateUserBody[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.full_name.trim() || !form.email.trim()) {
      setError("Full name and email are required");
      return;
    }
    setLoading(true);
    try {
      const body: CreateUserBody = { ...form };
      // Strip empties so the backend treats them as null/auto.
      (Object.keys(body) as (keyof CreateUserBody)[]).forEach((k) => {
        if (body[k] === "" || body[k] === undefined) delete body[k];
      });
      const creds =
        kind === "head"
          ? await api.users.createHead(token, body)
          : await api.users.createEmployee(token, body);
      onCreated(creds);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      setError(msg.replace(/^API \d+:\s*/, ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-4)",
          border: "1px solid var(--border-hairline)",
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 26,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--fg)", marginBottom: 4 }}>
          {kind === "head" ? "Add Head" : "Add Employee"}
        </h2>
        <p style={{ fontSize: 13, color: "var(--fg-muted)", marginBottom: 18 }}>
          A user ID and temporary password are generated automatically.
        </p>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#dc2626",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Input label="Full name *" value={form.full_name} onChange={(v) => set("full_name", v)} required />
          <Input label="Email *" type="email" value={form.email} onChange={(v) => set("email", v)} required />
          <Input label="Mobile" value={form.mobile ?? ""} onChange={(v) => set("mobile", v)} />
          <Input label="Department" value={form.department ?? ""} onChange={(v) => set("department", v)} />
          <Input label="Designation" value={form.designation ?? ""} onChange={(v) => set("designation", v)} />
          <Input label="Employee code (optional)" value={form.employee_code ?? ""} onChange={(v) => set("employee_code", v)} />
          <Input label="Joining date" type="date" value={form.joining_date ?? ""} onChange={(v) => set("joining_date", v)} />
          {kind === "employee" && heads.length > 0 && (
            <div>
              <Label>Reporting head</Label>
              <select
                value={form.manager_id ?? ""}
                onChange={(e) => set("manager_id", e.target.value || undefined)}
                style={inputStyle}
              >
                <option value="">— Default (you) —</option>
                {heads.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.full_name} ({h.role})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <Input label="Address" value={form.address ?? ""} onChange={(v) => set("address", v)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <Input label="Notes" value={form.notes ?? ""} onChange={(v) => set("notes", v)} />
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={btnSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 12, color: "var(--fg-faint)", marginBottom: 6, fontWeight: 500 }}>
      {children}
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "var(--radius-2)",
  background: "var(--bg)",
  border: "1px solid var(--border-hairline)",
  color: "var(--fg)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const btnBase: React.CSSProperties = {
  flex: 1,
  padding: "9px 14px",
  borderRadius: "var(--radius-2)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};
const btnSecondary: React.CSSProperties = {
  ...btnBase,
  background: "var(--bg-elevated)",
  color: "var(--fg-muted)",
  border: "1px solid var(--border-hairline)",
};
const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: "var(--accent)",
  color: "var(--fg-onaccent, #fff)",
  border: "1px solid var(--accent)",
};
