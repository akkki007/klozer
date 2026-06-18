"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { api, type WaConversation, type WaMessage } from "@/lib/api-client";

const WA_GREEN = "#25D366";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + (iso.endsWith("Z") ? "" : "Z"));
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return d.toLocaleDateString();
}

function clockTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + (iso.endsWith("Z") ? "" : "Z"));
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function WhatsAppInbox({ token }: { token: string }) {
  const [convos, setConvos] = useState<WaConversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const threadRef = useRef<HTMLDivElement>(null);

  const refreshConvos = useCallback(
    () => api.whatsapp.conversations(token).then(setConvos).catch(() => {}),
    [token]
  );

  const loadMessages = useCallback(
    (leadId: string) => api.whatsapp.messages(token, leadId).then(setMessages).catch(() => {}),
    [token]
  );

  // Initial load + poll conversations every 10s for new inbound messages.
  useEffect(() => {
    refreshConvos().finally(() => setLoading(false));
    const t = setInterval(refreshConvos, 10000);
    return () => clearInterval(t);
  }, [refreshConvos]);

  // When a conversation is open, load + poll its thread and mark it read.
  useEffect(() => {
    if (!active) return;
    loadMessages(active);
    api.whatsapp.markRead(token, active).then(refreshConvos).catch(() => {});
    const t = setInterval(() => loadMessages(active), 6000);
    return () => clearInterval(t);
  }, [active, token, loadMessages, refreshConvos]);

  // Auto-scroll the thread to the newest message.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages]);

  const activeConvo = convos.find((c) => c.lead_id === active);

  return (
    <div style={{ maxWidth: 1080 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--fg-display)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <FaWhatsapp style={{ color: WA_GREEN }} /> WhatsApp
        </h1>
        <p style={{ fontSize: 14, color: "var(--fg-muted)", marginTop: 4 }}>
          Messages your customers send to your business WhatsApp number.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          height: "calc(100vh - 220px)",
          minHeight: 420,
          border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-4)",
          overflow: "hidden",
          background: "var(--bg-elevated)",
        }}
      >
        {/* ── Conversation list ─────────────────────────────────── */}
        <div style={{ borderRight: "1px solid var(--border-hairline)", overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--fg-faint)", fontSize: 13 }}>Loading…</div>
          ) : convos.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--fg-muted)", fontSize: 13, lineHeight: 1.6 }}>
              No conversations yet.<br />
              Incoming customer messages will appear here.
            </div>
          ) : (
            convos.map((c) => {
              const isActive = c.lead_id === active;
              return (
                <button
                  key={c.lead_id}
                  onClick={() => setActive(c.lead_id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    gap: 11,
                    alignItems: "center",
                    padding: "12px 14px",
                    border: "none",
                    borderBottom: "1px solid var(--border-hairline)",
                    background: isActive ? "var(--bg-hover)" : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                      background: "rgba(37,211,102,0.15)", color: WA_GREEN,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                    }}
                  >
                    <FaWhatsapp />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.name}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--fg-faint)", flexShrink: 0 }}>{timeAgo(c.last_message_at)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 12, color: "var(--fg-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.last_direction === "out" ? "You: " : ""}{c.last_message ?? ""}
                      </span>
                      {c.unread > 0 && (
                        <span style={{ flexShrink: 0, minWidth: 18, height: 18, borderRadius: 9, background: WA_GREEN, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── Thread ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          {!activeConvo ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-faint)", fontSize: 13 }}>
              Select a conversation to view messages.
            </div>
          ) : (
            <>
              <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-hairline)" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)" }}>{activeConvo.name}</div>
                <div style={{ fontSize: 12, color: "var(--fg-faint)", fontFamily: "monospace" }}>{activeConvo.phone}</div>
              </div>

              <div ref={threadRef} style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.map((m) => {
                  const out = m.direction === "out";
                  return (
                    <div key={m.id} style={{ display: "flex", justifyContent: out ? "flex-end" : "flex-start" }}>
                      <div
                        style={{
                          maxWidth: "70%",
                          padding: "8px 11px",
                          borderRadius: out ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                          background: out ? "rgba(37,211,102,0.16)" : "var(--bg-soft)",
                          color: "var(--fg)",
                          fontSize: 13.5,
                          lineHeight: 1.45,
                        }}
                      >
                        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
                        <div style={{ fontSize: 10, color: "var(--fg-faint)", marginTop: 3, textAlign: "right" }}>
                          {clockTime(m.created_at)}{out && m.status ? ` · ${m.status}` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply box — disabled placeholder; the AI agent / manual reply lands here next. */}
              <div style={{ padding: "12px 18px", borderTop: "1px solid var(--border-hairline)" }}>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "var(--bg-soft)",
                    border: "1px solid var(--border-hairline)",
                    color: "var(--fg-faint)",
                    fontSize: 13,
                  }}
                >
                  Replying from the inbox (and AI auto-reply) is coming next.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
