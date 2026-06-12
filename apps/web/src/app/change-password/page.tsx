"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

export default function ChangePasswordPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const forced = session?.user?.mustChangePassword === true;

  function validate(): string | null {
    if (next.length < 8) return "New password must be at least 8 characters";
    if (!/[a-z]/.test(next)) return "Include a lowercase letter";
    if (!/[A-Z]/.test(next)) return "Include an uppercase letter";
    if (!/\d/.test(next)) return "Include a digit";
    if (next !== confirm) return "Passwords do not match";
    if (next === current) return "New password must differ from the current one";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    if (!session?.accessToken) {
      setError("Session expired — please sign in again.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.changePassword(session.accessToken, {
        current_password: current,
        new_password: next,
      });
      // Refresh the NextAuth token so middleware no longer forces this page.
      await update({ accessToken: res.access_token, mustChangePassword: false });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      setError(msg.replace(/^API \d+:\s*/, ""));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0F0F0F",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans, 'Inter', sans-serif)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <svg width="30" height="30" viewBox="0 0 26 26" fill="none">
              <rect width="26" height="26" rx="6" fill="#714B67" />
              <path d="M8 18L13 8L18 18" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9.5 14.5H16.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 19, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>LeadMax</span>
          </div>
        </div>

        <div
          style={{
            background: "#161616",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "30px 26px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            {forced ? "Set a new password" : "Change password"}
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 22 }}>
            {forced
              ? "Your account uses a temporary password. Choose a new one to continue."
              : "Update the password on your account."}
          </p>

          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label={forced ? "Temporary password" : "Current password"} value={current} onChange={setCurrent} />
            <Field label="New password" value={next} onChange={setNext} />
            <Field label="Confirm new password" value={confirm} onChange={setConfirm} />
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "11px 20px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: "#714B67",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                opacity: loading ? 0.7 : 1,
                marginTop: 4,
              }}
            >
              {loading ? "Saving…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      <input
        type="password"
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 7,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#fff",
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
