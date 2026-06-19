"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiPlus, FiSearch, FiUser, FiPhone, FiMail, FiRefreshCw } from "react-icons/fi";
import { api, type Lead, type LeadCategory } from "@/lib/api-client";

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

const CATEGORIES: { value: LeadCategory | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "fresh", label: "Fresh" },
  { value: "needs_followup", label: "Needs Follow-up" },
  { value: "uncontacted", label: "Uncontacted" },
  { value: "did_not_pick", label: "Did Not Pick" },
  { value: "outcome_unknown", label: "Outcome Unknown" },
];

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

function CategoryBadge({ cat }: { cat: LeadCategory }) {
  const c = CATEGORY_COLOR[cat];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
      background: c.bg, color: c.color, whiteSpace: "nowrap",
    }}>
      {CATEGORY_LABEL[cat]}
    </span>
  );
}

function AddLeadModal({ token, onClose, onAdded }: {
  token: string;
  onClose: () => void;
  onAdded: (lead: Lead) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const lead = await api.leads.create(token, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      onAdded(lead);
    } catch (err) {
      setError(err instanceof Error ? err.message.replace(/^API \d+:\s*/, "") : "Failed to create lead");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-elevated)", borderRadius: "var(--radius-4)",
        border: "1px solid var(--border-hairline)", padding: 28, width: 400, maxWidth: "90vw",
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-display)", margin: "0 0 20px" }}>
          Add Lead
        </h2>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={labelStyle}>
            Name *
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" required style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Phone
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 99999 99999" style={inputStyle} />
          </label>
          <label style={labelStyle}>
            Email
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" type="email" style={inputStyle} />
          </label>
          {error && <p style={{ fontSize: 12.5, color: "#c0392b", margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
            <button type="submit" disabled={busy || !name.trim()} style={primaryBtnStyle}>
              {busy ? "Adding…" : "Add Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LeadsClient({ token, role }: { token: string; role: string | null }) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<LeadCategory | "">("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "100" };
      if (category) params.category = category;
      const data = await api.leads.list(token, params);
      setLeads(data);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [token, category]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const filtered = leads.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      (l.phone ?? "").includes(q) ||
      (l.email ?? "").toLowerCase().includes(q)
    );
  });

  const canAdd = role === "company_admin" || role === "head" || role === "employee";

  return (
    <div style={{ maxWidth: 1080 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--fg-display)", margin: 0 }}>Leads</h1>
          <p style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 3 }}>
            {loading ? "Loading…" : `${filtered.length} lead${filtered.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={fetchLeads} title="Refresh" style={iconBtnStyle}>
            <FiRefreshCw size={15} />
          </button>
          {canAdd && (
            <button onClick={() => setShowAdd(true)} style={primaryBtnStyle}>
              <FiPlus size={15} /> Add Lead
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <FiSearch size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-faint)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email…"
            style={{ ...inputStyle, paddingLeft: 32, width: "100%", boxSizing: "border-box" }}
          />
        </div>
        {/* Category filter */}
        <select
          value={category}
          onChange={e => setCategory(e.target.value as LeadCategory | "")}
          style={{ ...inputStyle, width: "auto", paddingRight: 28 }}
        >
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{
        background: "var(--bg-elevated)", borderRadius: "var(--radius-4)",
        border: "1px solid var(--border-hairline)", overflow: "hidden",
      }}>
        {/* Table header */}
        <div style={{ ...rowStyle, background: "var(--bg-soft)", cursor: "default", borderBottom: "1px solid var(--border-hairline)" }}>
          <span style={thStyle}>Name</span>
          <span style={thStyle}>Phone</span>
          <span style={thStyle}>Email</span>
          <span style={thStyle}>Category</span>
          <span style={{ ...thStyle, textAlign: "right" }}>Created</span>
        </div>

        {loading ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--fg-faint)", fontSize: 13 }}>
            Loading leads…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <FiUser size={32} style={{ color: "var(--fg-faint)", marginBottom: 10 }} />
            <p style={{ fontSize: 14, color: "var(--fg-muted)", margin: 0 }}>
              {search || category ? "No leads match your filters." : "No leads yet."}
            </p>
            {canAdd && !search && !category && (
              <button onClick={() => setShowAdd(true)} style={{ ...primaryBtnStyle, marginTop: 14 }}>
                <FiPlus size={14} /> Add your first lead
              </button>
            )}
          </div>
        ) : (
          filtered.map((lead, i) => (
            <div
              key={lead.id}
              onClick={() => router.push(`/leads/${lead.id}`)}
              style={{
                ...rowStyle,
                borderBottom: i < filtered.length - 1 ? "1px solid var(--border-hairline)" : "none",
                cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lead.name}
              </span>
              <span style={{ fontSize: 13, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                {lead.phone ? <><FiPhone size={12} />{lead.phone}</> : <span style={{ color: "var(--fg-faint)" }}>—</span>}
              </span>
              <span style={{ fontSize: 13, color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lead.email ? <><FiMail size={12} style={{ marginRight: 4 }} />{lead.email}</> : <span style={{ color: "var(--fg-faint)" }}>—</span>}
              </span>
              <span><CategoryBadge cat={lead.category} /></span>
              <span style={{ fontSize: 12, color: "var(--fg-faint)", textAlign: "right" }}>
                {timeAgo(lead.created_at)}
              </span>
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <AddLeadModal
          token={token}
          onClose={() => setShowAdd(false)}
          onAdded={lead => { setLeads(prev => [lead, ...prev]); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1.2fr 1.8fr 1.4fr 100px",
  alignItems: "center",
  gap: 12,
  padding: "12px 18px",
};

const thStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--fg-faint)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  display: "block",
  marginTop: 5,
  padding: "9px 11px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--fg)",
  fontSize: 13.5,
  fontFamily: "var(--font-sans)",
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
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--fg)",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
};

const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--fg-muted)",
  cursor: "pointer",
};
