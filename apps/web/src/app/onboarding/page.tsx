"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const BUSINESS_TYPES = [
  { id: "real_estate", emoji: "🏠", label: "Real Estate", desc: "Property sales, agents, builders" },
  { id: "edtech", emoji: "📚", label: "Education", desc: "Coaching, courses, institutes" },
  { id: "financial", emoji: "💰", label: "Financial Services", desc: "Loans, insurance, investments" },
  { id: "healthcare", emoji: "🏥", label: "Healthcare", desc: "Clinics, hospitals, wellness" },
  { id: "manufacturing", emoji: "🏭", label: "Manufacturing", desc: "B2B sales, distributors" },
  { id: "services", emoji: "⚙️", label: "Professional Services", desc: "Consulting, IT, agencies" },
  { id: "retail", emoji: "🛍️", label: "Retail & E-commerce", desc: "Products, D2C, stores" },
  { id: "other", emoji: "✨", label: "Other", desc: "Something else entirely" },
];

const TEAM_SIZES = [
  { id: "1", label: "Just me", desc: "Solo founder / rep" },
  { id: "2-5", label: "2–5", desc: "Small team" },
  { id: "6-20", label: "6–20", desc: "Growing team" },
  { id: "21-50", label: "21–50", desc: "Mid-size sales org" },
  { id: "50+", label: "50+", desc: "Large enterprise" },
];

const LEAD_SOURCES = [
  { id: "facebook_ads", emoji: "📘", label: "Facebook / Instagram Ads" },
  { id: "whatsapp", emoji: "💬", label: "WhatsApp enquiries" },
  { id: "referral", emoji: "🤝", label: "Referrals & word of mouth" },
  { id: "google_ads", emoji: "🔍", label: "Google Ads" },
  { id: "cold_calls", emoji: "📞", label: "Cold calling / outbound" },
  { id: "website", emoji: "🌐", label: "Website contact forms" },
  { id: "events", emoji: "🎪", label: "Events & exhibitions" },
];

export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [businessType, setBusinessType] = useState("");
  const [orgName, setOrgName] = useState("");
  const [website, setWebsite] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [leadSources, setLeadSources] = useState<string[]>([]);

  const totalSteps = 3;
  const progress = ((step + 1) / totalSteps) * 100;

  function toggleLeadSource(id: string) {
    setLeadSources((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleFinish() {
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/onboarding`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          org_name: orgName,
          business_type: businessType,
          team_size: teamSize,
          website: website || null,
          lead_source_pref: leadSources.join(","),
        }),
      });
      if (res.ok) {
        router.push("/dashboard");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F0F0F",
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-sans, 'Inter', sans-serif)",
    }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", position: "fixed", top: 0, left: 0, right: 0, zIndex: 50 }}>
        <div style={{
          height: "100%", width: `${progress}%`,
          background: "#714B67",
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Header */}
      <div style={{ padding: "20px 40px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="24" height="24" viewBox="0 0 26 26" fill="none">
            <rect width="26" height="26" rx="6" fill="url(#ob-grad)" />
            <path d="M8 18L13 8L18 18" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9.5 14.5H16.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            <defs>
              <linearGradient id="ob-grad" x1="0" y1="0" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                <stop stopColor="#714B67" /><stop offset="1" stopColor="#017E84" />
              </linearGradient>
            </defs>
          </svg>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>LeadMax</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
          Step {step + 1} of {totalSteps}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px 40px" }}>
        <div style={{ width: "100%", maxWidth: 640 }}>

          {step === 0 && (
            <StepBusinessType
              value={businessType}
              onChange={setBusinessType}
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <StepBusinessDetails
              orgName={orgName}
              website={website}
              teamSize={teamSize}
              onOrgName={setOrgName}
              onWebsite={setWebsite}
              onTeamSize={setTeamSize}
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <StepLeadSources
              selected={leadSources}
              onToggle={toggleLeadSource}
              onBack={() => setStep(1)}
              onFinish={handleFinish}
              submitting={submitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StepBusinessType({ value, onChange, onNext }: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#9B6B8A", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          Step 1 of 3
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: "-0.025em" }}>
          What type of business are you?
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)" }}>
          This helps us tailor LeadMax for your sales process.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
        {BUSINESS_TYPES.map((bt) => (
          <button
            key={bt.id}
            onClick={() => onChange(bt.id)}
            style={{
              padding: "16px 18px", borderRadius: 10, cursor: "pointer",
              textAlign: "left", border: "1px solid",
              borderColor: value === bt.id ? "#714B67" : "rgba(255,255,255,0.10)",
              background: value === bt.id ? "rgba(113,75,103,0.15)" : "rgba(255,255,255,0.03)",
              transition: "all 0.15s",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>{bt.emoji}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 3 }}>{bt.label}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{bt.desc}</div>
          </button>
        ))}
      </div>

      <NextButton disabled={!value} onClick={onNext} label="Continue" />
    </div>
  );
}

function StepBusinessDetails({ orgName, website, teamSize, onOrgName, onWebsite, onTeamSize, onBack, onNext }: {
  orgName: string;
  website: string;
  teamSize: string;
  onOrgName: (v: string) => void;
  onWebsite: (v: string) => void;
  onTeamSize: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#1AB8BE", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          Step 2 of 3
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: "-0.025em" }}>
          Tell us about your business
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)" }}>
          Just a few details to personalise your workspace.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 32 }}>
        <Field label="Business name *" required>
          <input
            type="text"
            value={orgName}
            onChange={(e) => onOrgName(e.target.value)}
            placeholder="e.g. Sharma Properties Pvt. Ltd."
            style={inputStyle}
          />
        </Field>

        <Field label="Website" required={false}>
          <input
            type="url"
            value={website}
            onChange={(e) => onWebsite(e.target.value)}
            placeholder="https://yourcompany.com"
            style={inputStyle}
          />
        </Field>

        <Field label="How many people are on your sales team? *" required>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {TEAM_SIZES.map((ts) => (
              <button
                key={ts.id}
                onClick={() => onTeamSize(ts.id)}
                style={{
                  padding: "9px 18px", borderRadius: 8, cursor: "pointer",
                  border: "1px solid",
                  borderColor: teamSize === ts.id ? "#017E84" : "rgba(255,255,255,0.12)",
                  background: teamSize === ts.id ? "rgba(1,126,132,0.15)" : "rgba(255,255,255,0.03)",
                  color: teamSize === ts.id ? "#1AB8BE" : "rgba(255,255,255,0.6)",
                  fontSize: 13, fontWeight: teamSize === ts.id ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                {ts.label}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <BackButton onClick={onBack} />
        <NextButton disabled={!orgName || !teamSize} onClick={onNext} label="Continue" />
      </div>
    </div>
  );
}

function StepLeadSources({ selected, onToggle, onBack, onFinish, submitting }: {
  selected: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onFinish: () => void;
  submitting: boolean;
}) {
  return (
    <div>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#C490B3", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          Step 3 of 3
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 8, letterSpacing: "-0.025em" }}>
          Where do your leads come from?
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)" }}>
          Select all that apply. We&apos;ll set up the right integrations for you.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}>
        {LEAD_SOURCES.map((ls) => {
          const isSelected = selected.includes(ls.id);
          return (
            <button
              key={ls.id}
              onClick={() => onToggle(ls.id)}
              style={{
                padding: "14px 18px", borderRadius: 10, cursor: "pointer",
                textAlign: "left",
                display: "flex", alignItems: "center", gap: 14,
                border: "1px solid",
                borderColor: isSelected ? "#714B67" : "rgba(255,255,255,0.08)",
                background: isSelected ? "rgba(113,75,103,0.12)" : "rgba(255,255,255,0.02)",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 20 }}>{ls.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? "#C490B3" : "rgba(255,255,255,0.7)" }}>
                {ls.label}
              </span>
              <div style={{ marginLeft: "auto" }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 5,
                  border: `2px solid ${isSelected ? "#714B67" : "rgba(255,255,255,0.2)"}`,
                  background: isSelected ? "#714B67" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {isSelected && <span style={{ fontSize: 10, color: "#fff", lineHeight: 1 }}>✓</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <BackButton onClick={onBack} />
        <button
          onClick={onFinish}
          disabled={selected.length === 0 || submitting}
          style={{
            flex: 1, padding: "13px 24px", borderRadius: 8, border: "none",
            cursor: selected.length === 0 || submitting ? "not-allowed" : "pointer",
            background: selected.length > 0 && !submitting
              ? "#714B67"
              : "rgba(255,255,255,0.08)",
            color: selected.length > 0 && !submitting ? "#fff" : "rgba(255,255,255,0.3)",
            fontWeight: 600, fontSize: 14,
            transition: "all 0.15s",
          }}
        >
          {submitting ? "Setting up your workspace..." : "Launch my workspace →"}
        </button>
      </div>

      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 16 }}>
        You can change these settings anytime from the Integrations page.
      </p>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required: boolean }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 8,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff", fontSize: 14, outline: "none",
  boxSizing: "border-box",
};

function NextButton({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, padding: "13px 24px", borderRadius: 8, border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: !disabled
          ? "#714B67"
          : "rgba(255,255,255,0.08)",
        color: !disabled ? "#fff" : "rgba(255,255,255,0.3)",
        fontWeight: 600, fontSize: 14,
        transition: "all 0.15s",
      }}
    >
      {label} →
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "13px 20px", borderRadius: 8, cursor: "pointer",
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "rgba(255,255,255,0.5)", fontWeight: 500, fontSize: 14,
      }}
    >
      ← Back
    </button>
  );
}
