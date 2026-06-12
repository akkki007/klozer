"use client";

import { useEffect, useState } from "react";
import { api, type DashboardData } from "@/lib/api-client";

const CARD_META: Record<string, { label: string; color: string; money?: boolean; pct?: boolean }> = {
  total_heads: { label: "Total Heads", color: "#714B67" },
  total_employees: { label: "Total Employees", color: "#017E84" },
  active_users: { label: "Active Users", color: "#F59E0B" },
  leads: { label: "Leads", color: "#017E84" },
  conversions: { label: "Conversions", color: "#714B67" },
  revenue: { label: "Revenue", color: "#16A34A", money: true },
  team_size: { label: "Team Size", color: "#714B67" },
  team_leads: { label: "Team Leads", color: "#017E84" },
  followups_pending: { label: "Follow-ups Pending", color: "#F59E0B" },
  assigned_leads: { label: "Assigned Leads", color: "#017E84" },
  tasks: { label: "Tasks", color: "#714B67" },
  followups: { label: "Follow-ups", color: "#F59E0B" },
  conversion_rate: { label: "Conversion Rate", color: "#16A34A", pct: true },
};

export default function DashboardCards({ token }: { token: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setData(await api.dashboard.get(token));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load metrics");
      }
    })();
  }, [token]);

  if (error) return <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>;

  const entries = data ? Object.entries(data.cards) : [];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: 16,
        marginBottom: 28,
      }}
    >
      {(entries.length ? entries : placeholders()).map(([key, value]) => {
        const meta = CARD_META[key] ?? { label: key, color: "#888" };
        const display =
          value === null || value === undefined
            ? "—"
            : meta.money
            ? `₹${Number(value).toLocaleString()}`
            : meta.pct
            ? `${value}%`
            : value;
        return (
          <div
            key={key}
            style={{
              background: "var(--bg-elevated)",
              borderRadius: "var(--radius-4)",
              border: "1px solid var(--border-hairline)",
              boxShadow: "var(--shadow-1)",
              padding: "20px 22px",
            }}
          >
            <p style={{ fontSize: 12, color: "var(--fg-faint)", marginBottom: 8, fontWeight: 500 }}>{meta.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: meta.color }}>{display}</p>
          </div>
        );
      })}
    </div>
  );
}

function placeholders(): [string, number | null][] {
  return [
    ["leads", null],
    ["conversions", null],
    ["active_users", null],
  ];
}
