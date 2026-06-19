"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiArrowLeft, FiPhone, FiMail, FiEdit2, FiCheck, FiX,
  FiMessageSquare, FiCheckSquare, FiClock, FiActivity,
} from "react-icons/fi";
import { api, type Lead, type LeadActivity, type LeadCategory } from "@/lib/api-client";

const CATEGORY_LABEL: Record<LeadCategory, string> = {
  fresh: "Fresh",
  needs_followup: "Needs Follow-up",
  uncontacted: "Uncontacted",
  did_not_pick: "Did Not Pick",
  outcome_unknown: "Outcome Unknown",
};

const CATEGORY_COLOR: Record<LeadCategory, { bg: string; color: string }> = {
  fresh: { bg: "rgba(37,211,102,0.12)", color: "#1a9e52" },
  needs_followup: { bg: "rgba(245,158,11,0.12)", color: "#b45309" },
  uncontacted: { bg: "rgba(99,102,241,0.12)", color: "#4338ca" },
  did_not_pick: { bg: "rgba(239,68,68,0.12)", color: "#b91c1c" },
  outcome_unknown: { bg: "rgba(156,163,175,0.15)", color: "#6b7280" },
};

const ACTIVITY_TYPES = [
  { value: "call_out", label: "Outgoing Call" },
  { value: "call_in", label: "Incoming Call" },
  { value: "visit", label: "Visit" },
  { value: "note", label: "Note" },
  { value: "whatsapp", label: "WhatsApp" },
];

const ACTIVITY_ICON: Record<string, React.ReactNode> = {
  call_out: <FiPhone size={13} />,
  call_in: <FiPhone size={13} />,
  visit: <FiActivity size={13} />,
  note: <FiMessageSquare size={13} />,
  whatsapp: <FiMessageSquare size={13} />,
  status_change: <FiCheck size={13} />,
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

function LogActivityModal({ token, leadId, onClose, onLogged }: {
  token: string;
  leadId: string;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [type, setType] = useState("call_out");
  const [body, setBody] = useState("");
  const [outcome, setOutcome] = useState("");
  const [duration, setDuration] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.leads.logActivity(token, {
        lead_id: leadId,
        type,
        body: body.trim() || undefined,
        outcome: outcome.trim() || undefined,
        duration_sec: duration ? parseInt(duration) * 60 : undefined,
      });
      onLogged();
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^API \d+:\s*/, "") : "Failed to log activity");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <h2 style={modalTitleStyle}>Log Activity</h2>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={labelStyle}>
            Type
            <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
              {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          {(type === "call_out" || type === "call_in") && (
            <label style={labelStyle}>
              Duration (minutes)
              <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 5" type="number" min="0" style={inputStyle} />
            </label>
          )}
          <label style={labelStyle}>
            Outcome
            <input value={outcome} onChange={e => setOutcome(e.target.value)} placeholder="e.g. Interested, Call back, Not interested" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Notes
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Add any notes…"
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </label>
          {error && <p style={{ fontSize: 12.5, color: "#c0392b", margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
            <button type="submit" disabled={busy} style={primaryBtnStyle}>{busy ? "Logging…" : "Log Activity"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddTaskModal({ token, leadId, onClose, onAdded }: {
  token: string;
  leadId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.leads.createTask(token, {
        lead_id: leadId,
        title: title.trim(),
        due_at: dueAt || undefined,
      });
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^API \d+:\s*/, "") : "Failed to create task");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <h2 style={modalTitleStyle}>Add Task</h2>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={labelStyle}>
            Task *
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Follow up call, Send brochure" required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Due date & time
            <input value={dueAt} onChange={e => setDueAt(e.target.value)} type="datetime-local" style={inputStyle} />
          </label>
          {error && <p style={{ fontSize: 12.5, color: "#c0392b", margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
            <button type="submit" disabled={busy || !title.trim()} style={primaryBtnStyle}>{busy ? "Adding…" : "Add Task"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LeadDetailClient({ token, leadId, role }: {
  token: string;
  leadId: string;
  role: string | null;
}) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCategory, setEditCategory] = useState<LeadCategory>("fresh");
  const [saving, setSaving] = useState(false);

  // Modals
  const [showLog, setShowLog] = useState(false);
  const [showTask, setShowTask] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      const acts = await api.leads.activities(token, leadId);
      setActivities(acts);
    } catch { /* silent */ }
  }, [token, leadId]);

  useEffect(() => {
    (async () => {
      try {
        const [l] = await Promise.all([
          api.leads.get(token, leadId),
          api.leads.activities(token, leadId).then(setActivities).catch(() => {}),
        ]);
        setLead(l);
        setEditName(l.name);
        setEditPhone(l.phone ?? "");
        setEditEmail(l.email ?? "");
        setEditCategory(l.category);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, leadId]);

  async function saveEdit() {
    if (!lead) return;
    setSaving(true);
    try {
      const updated = await api.leads.update(token, leadId, {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        category: editCategory,
      });
      setLead(updated);
      setEditing(false);
    } catch { /* silent */ }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div style={{ padding: 48, textAlign: "center", color: "var(--fg-faint)", fontSize: 13 }}>Loading…</div>
  );

  if (notFound || !lead) return (
    <div style={{ padding: 48, textAlign: "center" }}>
      <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>Lead not found.</p>
      <button onClick={() => router.push("/leads")} style={{ ...secondaryBtnStyle, marginTop: 12 }}>
        Back to Leads
      </button>
    </div>
  );

  const catColor = CATEGORY_COLOR[lead.category];

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Back */}
      <button onClick={() => router.push("/leads")} style={{ ...secondaryBtnStyle, marginBottom: 20, display: "inline-flex", alignItems: "center", gap: 6 }}>
        <FiArrowLeft size={14} /> Leads
      </button>

      {/* Lead card */}
      <div style={{
        background: "var(--bg-elevated)", borderRadius: "var(--radius-4)",
        border: "1px solid var(--border-hairline)", padding: 24, marginBottom: 24,
      }}>
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <label style={labelStyle}>
                Name *
                <input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Phone
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Email
                <input value={editEmail} onChange={e => setEditEmail(e.target.value)} type="email" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                Category
                <select value={editCategory} onChange={e => setEditCategory(e.target.value as LeadCategory)} style={inputStyle}>
                  {(Object.keys(CATEGORY_LABEL) as LeadCategory[]).map(c => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveEdit} disabled={saving || !editName.trim()} style={primaryBtnStyle}>
                <FiCheck size={14} /> {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditing(false)} style={secondaryBtnStyle}>
                <FiX size={14} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--fg-display)", margin: 0 }}>{lead.name}</h1>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                  background: catColor.bg, color: catColor.color,
                }}>
                  {CATEGORY_LABEL[lead.category]}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {lead.phone && (
                  <span style={{ fontSize: 13.5, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <FiPhone size={13} />{lead.phone}
                  </span>
                )}
                {lead.email && (
                  <span style={{ fontSize: 13.5, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                    <FiMail size={13} />{lead.email}
                  </span>
                )}
                <span style={{ fontSize: 12, color: "var(--fg-faint)", display: "flex", alignItems: "center", gap: 5 }}>
                  <FiClock size={12} /> Added {timeAgo(lead.created_at)}
                </span>
                {lead.last_engaged_at && (
                  <span style={{ fontSize: 12, color: "var(--fg-faint)" }}>
                    Last activity {timeAgo(lead.last_engaged_at)}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => setEditing(true)} style={iconBtnStyle} title="Edit lead">
              <FiEdit2 size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <button onClick={() => setShowLog(true)} style={primaryBtnStyle}>
          <FiActivity size={14} /> Log Activity
        </button>
        <button onClick={() => setShowTask(true)} style={secondaryBtnStyle}>
          <FiCheckSquare size={14} /> Add Task
        </button>
        {lead.phone && (
          <a href={`tel:${lead.phone}`} style={{ ...secondaryBtnStyle, textDecoration: "none" }}>
            <FiPhone size={14} /> Call
          </a>
        )}
        {lead.phone && (
          <a
            href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...secondaryBtnStyle, textDecoration: "none", color: "#1a9e52" }}
          >
            WhatsApp
          </a>
        )}
      </div>

      {/* Activity timeline */}
      <div style={{
        background: "var(--bg-elevated)", borderRadius: "var(--radius-4)",
        border: "1px solid var(--border-hairline)", overflow: "hidden",
      }}>
        <div style={{
          padding: "14px 18px", borderBottom: "1px solid var(--border-hairline)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", margin: 0 }}>
            Activity Timeline
          </h2>
          <span style={{ fontSize: 12, color: "var(--fg-faint)" }}>{activities.length} entries</span>
        </div>

        {activities.length === 0 ? (
          <div style={{ padding: "36px 24px", textAlign: "center", color: "var(--fg-faint)", fontSize: 13 }}>
            No activity yet. Log a call, visit, or note above.
          </div>
        ) : (
          <div style={{ padding: "8px 0" }}>
            {activities.map((act, i) => (
              <div key={act.id} style={{
                display: "flex", gap: 14, padding: "14px 18px",
                borderBottom: i < activities.length - 1 ? "1px solid var(--border-hairline)" : "none",
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                  background: "var(--bg-soft)", color: "var(--fg-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {ACTIVITY_ICON[act.type] ?? <FiActivity size={13} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--fg)", textTransform: "capitalize" }}>
                      {act.type.replace("_", " ")}
                      {act.outcome && <span style={{ fontSize: 12, fontWeight: 400, color: "var(--fg-muted)", marginLeft: 8 }}>· {act.outcome}</span>}
                      {act.duration_sec && <span style={{ fontSize: 12, fontWeight: 400, color: "var(--fg-muted)", marginLeft: 8 }}>· {Math.round(act.duration_sec / 60)}m</span>}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--fg-faint)", flexShrink: 0 }}>{timeAgo(act.created_at)}</span>
                  </div>
                  {act.body && (
                    <p style={{ fontSize: 13, color: "var(--fg-muted)", margin: 0, lineHeight: 1.5 }}>{act.body}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showLog && (
        <LogActivityModal
          token={token}
          leadId={leadId}
          onClose={() => setShowLog(false)}
          onLogged={() => { setShowLog(false); fetchActivities(); }}
        />
      )}
      {showTask && (
        <AddTaskModal
          token={token}
          leadId={leadId}
          onClose={() => setShowTask(false)}
          onAdded={() => setShowTask(false)}
        />
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
  fontFamily: "var(--font-sans)",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--fg-muted)",
};

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 16px",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "var(--fg-onaccent)",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
};

const secondaryBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--fg)",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
};

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--fg-muted)",
  cursor: "pointer",
  flexShrink: 0,
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  borderRadius: "var(--radius-4)",
  border: "1px solid var(--border-hairline)",
  padding: 28,
  width: 440,
  maxWidth: "90vw",
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "var(--fg-display)",
  margin: "0 0 20px",
};
