"use client";

import { useEffect, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";
import { api, type NotificationItem } from "@/lib/api-client";

export default function NotificationBell({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await api.notifications.list(token);
      setItems(res.items);
      setUnread(res.unread_count);
    } catch {
      /* silent — header widget */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000); // poll once a minute
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAll() {
    await api.notifications.markAllRead(token);
    await load();
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        style={{
          position: "relative",
          width: 34,
          height: 34,
          borderRadius: 8,
          border: "1px solid var(--border-hairline)",
          background: "var(--bg-elevated)",
          color: "var(--fg-muted)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FiBell size={17} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 999,
              background: "#dc2626",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 42,
            width: 320,
            maxHeight: 400,
            overflowY: "auto",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-4)",
            boxShadow: "var(--shadow-2, 0 10px 40px rgba(0,0,0,0.2))",
            zIndex: 50,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: "1px solid var(--border-hairline)",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>Notifications</span>
            {unread > 0 && (
              <button
                onClick={markAll}
                style={{ background: "none", border: "none", color: "var(--accent-text, #714B67)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p style={{ padding: 20, textAlign: "center", color: "var(--fg-faint)", fontSize: 13 }}>
              No notifications.
            </p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "11px 14px",
                  borderBottom: "1px solid var(--border-hairline)",
                  background: n.is_read ? "transparent" : "var(--bg-hover, rgba(113,75,103,0.05))",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{n.body}</div>}
                <div style={{ fontSize: 11, color: "var(--fg-faint)", marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
