"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { IconType } from "react-icons";
import {
  FiGrid,
  FiShare2,
  FiUsers,
  FiGitMerge,
  FiFileText,
  FiBarChart2,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";
import NotificationBell from "./NotificationBell";

type NavItem = {
  label: string;
  href: string;
  Icon: IconType;
  enabled: boolean;
  roles?: string[]; // when set, only these roles see the item
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", Icon: FiGrid, enabled: true },
  { label: "User Management", href: "/users", Icon: FiUsers, enabled: true, roles: ["company_admin", "head"] },
  { label: "Organization", href: "/org", Icon: FiGitMerge, enabled: true },
  { label: "Audit Log", href: "/audit", Icon: FiFileText, enabled: true, roles: ["company_admin"] },
  { label: "Social Profiles", href: "/integrations", Icon: FiShare2, enabled: true },
  { label: "Analytics", href: "/analytics", Icon: FiBarChart2, enabled: false },
  { label: "Settings", href: "/settings", Icon: FiSettings, enabled: false },
];

const SIDEBAR_W = 236;

function BrandMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 26 26" fill="none" aria-hidden>
      <rect width="26" height="26" rx="6" fill="var(--accent)" />
      <path d="M8 18L13 8L18 18" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 14.5H16.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function AppShell({
  user,
  token,
  children,
}: {
  user: { name?: string | null; role?: string | null };
  token?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const role = user.role ?? "employee";
  const navItems = NAV.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex" }}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        style={{
          width: SIDEBAR_W,
          flexShrink: 0,
          background: "var(--bg-elevated)",
          borderRight: "1px solid var(--border-hairline)",
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          padding: "18px 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 8px 18px" }}>
          <BrandMark />
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--fg)", letterSpacing: "-0.02em" }}>
            LeadMax
          </span>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <button
                key={item.href}
                onClick={() => item.enabled && router.push(item.href)}
                disabled={!item.enabled}
                title={item.enabled ? item.label : "Coming soon"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "9px 10px",
                  borderRadius: "var(--radius-2)",
                  border: "none",
                  textAlign: "left",
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  cursor: item.enabled ? "pointer" : "default",
                  background: active ? "var(--bg-hover)" : "transparent",
                  color: !item.enabled
                    ? "var(--fg-faint)"
                    : active
                    ? "var(--accent-text)"
                    : "var(--fg-muted)",
                }}
                onMouseEnter={(e) => {
                  if (item.enabled && !active) e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <item.Icon size={17} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {!item.enabled && (
                  <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.4, color: "var(--fg-faint)" }}>
                    SOON
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "9px 10px",
            borderRadius: "var(--radius-2)",
            border: "none",
            background: "transparent",
            color: "var(--fg-muted)",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <FiLogOut size={17} />
          Sign out
        </button>
      </aside>

      {/* ── Main column ─────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 56,
            flexShrink: 0,
            background: "var(--bg-elevated)",
            borderBottom: "1px solid var(--border-hairline)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
            padding: "0 28px",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          {token && <NotificationBell token={token} />}
          <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>{user.name}</span>
          {user.role && (
            <span
              style={{
                background: "rgba(113,75,103,0.12)",
                color: "var(--accent-text)",
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {user.role}
            </span>
          )}
        </header>

        <main style={{ flex: 1, padding: "32px 28px 64px", overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
