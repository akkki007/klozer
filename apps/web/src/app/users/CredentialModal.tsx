"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";
import type { Credentials } from "@/lib/api-client";

export default function CredentialModal({
  creds,
  onClose,
}: {
  creds: Credentials;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const lines = [
    `Full name: ${creds.full_name}`,
    `Login email: ${creds.email ?? "—"}`,
    `Employee code: ${creds.employee_code ?? "—"}`,
    `Temporary password: ${creds.temp_password}`,
  ];

  async function copyAll() {
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadPdf() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor("#714B67");
    doc.text("LeadMax — Account Credentials", 20, 24);
    doc.setFontSize(11);
    doc.setTextColor("#333");
    doc.text("Share these securely. The user must change the password on first login.", 20, 34);
    let y = 50;
    lines.forEach((l) => {
      doc.text(l, 20, y);
      y += 10;
    });
    doc.setFontSize(9);
    doc.setTextColor("#999");
    doc.text(`Generated ${new Date().toLocaleString()}`, 20, y + 6);
    doc.save(`credentials-${creds.employee_code ?? creds.user_id}.pdf`);
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
          maxWidth: 440,
          width: "100%",
          padding: 26,
          boxShadow: "var(--shadow-2, 0 10px 40px rgba(0,0,0,0.3))",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--fg)", marginBottom: 4 }}>
          Account created
        </h2>
        <p style={{ fontSize: 13, color: "var(--fg-muted)", marginBottom: 18 }}>
          These credentials are shown <strong>once</strong>. Copy or download them now.
          {creds.email_sent ? " They were also emailed to the user." : " (Email delivery is disabled.)"}
        </p>

        <div
          style={{
            background: "var(--bg-soft, #f6f6f6)",
            borderRadius: "var(--radius-2)",
            padding: "14px 16px",
            marginBottom: 18,
            fontSize: 13,
            lineHeight: 1.9,
          }}
        >
          <Row label="Full name" value={creds.full_name} />
          <Row label="Login email" value={creds.email ?? "—"} />
          <Row label="Employee code" value={creds.employee_code ?? "—"} mono />
          <Row label="Temp password" value={creds.temp_password} mono />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={copyAll} style={btnSecondary}>
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <button onClick={downloadPdf} style={btnSecondary}>
            Download PDF
          </button>
          <button onClick={onClose} style={btnPrimary}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "var(--fg-faint)" }}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          color: "var(--fg)",
          fontFamily: mono ? "var(--font-mono, monospace)" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

const btnBase: React.CSSProperties = {
  flex: 1,
  padding: "9px 14px",
  borderRadius: "var(--radius-2)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid var(--border-hairline)",
};
const btnSecondary: React.CSSProperties = {
  ...btnBase,
  background: "var(--bg-elevated)",
  color: "var(--fg-muted)",
};
const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: "var(--accent)",
  color: "var(--fg-onaccent, #fff)",
  border: "1px solid var(--accent)",
};
