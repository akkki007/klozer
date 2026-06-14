/**
 * Floating "snapshot" cards that flank the hero (2 left, 2 right) — recreations
 * of Facebook / Instagram / WhatsApp / LinkedIn lead UIs, built in pure markup
 * (no screenshots). Theme-aware surfaces; hidden below xl so they never crowd
 * the centered heading on smaller screens. Purely decorative → pointer-events
 * off so they never block the hero CTAs.
 */

function FacebookIco() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="7" fill="#1877F2" />
      <path d="M15.4 8h-1.5c-.5 0-.7.3-.7.8V10h2.1l-.3 2.1h-1.8V18h-2.2v-5.9H9.2V10h1.8V8.5C11 6.8 12 6 13.6 6c.7 0 1.4.1 1.8.1V8z" fill="#fff" />
    </svg>
  );
}
function InstagramIco() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="igGrad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.35" stopColor="#FA7E1E" />
          <stop offset="0.6" stopColor="#D62976" />
          <stop offset="1" stopColor="#962FBF" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="7" fill="url(#igGrad)" />
      <rect x="6.2" y="6.2" width="11.6" height="11.6" rx="3.6" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.7" fill="none" stroke="#fff" strokeWidth="1.5" />
      <circle cx="15.5" cy="8.5" r="0.95" fill="#fff" />
    </svg>
  );
}
function WhatsAppIco() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="7" fill="#25D366" />
      <path d="M12 5.5a6.4 6.4 0 0 0-5.5 9.7L5.7 18.5l3.4-.9A6.4 6.4 0 1 0 12 5.5zm3.7 9c-.16.45-.9.86-1.25.9-.32.03-.72.05-1.16-.07a9.6 9.6 0 0 1-1.05-.39 8.2 8.2 0 0 1-3.13-2.77c-.23-.31-.6-.86-.6-1.64 0-.78.41-1.16.55-1.32a.6.6 0 0 1 .43-.2h.3c.1 0 .23-.01.36.27.13.32.45 1.1.49 1.18.04.08.06.17.01.27-.18.36-.37.5-.5.66-.13.16-.27.27-.12.53.16.26.7 1.14 1.5 1.85.71.63 1.3.83 1.56.95.26.13.41.11.56-.07.16-.18.65-.76.83-1.02.17-.26.34-.21.56-.13.23.08 1.45.69 1.7.81.25.13.42.19.48.29.05.1.05.6-.11 1.05z" fill="#fff" />
    </svg>
  );
}
function LinkedInIco() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="7" fill="#0A66C2" />
      <circle cx="8" cy="8" r="1.3" fill="#fff" />
      <rect x="6.9" y="10.2" width="2.2" height="7.3" fill="#fff" />
      <path d="M11 17.5v-4c0-1.4 1-2.5 2.5-2.5S16 12.1 16 13.5v4h-2.2v-3.7c0-.5-.4-.9-.9-.9s-.9.4-.9.9v3.7H11z" fill="#fff" />
    </svg>
  );
}

function Pill({ text, bg, color }: { text: string; bg: string; color: string }) {
  return (
    <span style={{ fontSize: 9.5, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: bg, color }}>
      {text}
    </span>
  );
}

function Card({
  top,
  left,
  right,
  rotate,
  delay,
  accent,
  icon,
  platform,
  sub,
  children,
}: {
  top: number;
  left?: number;
  right?: number;
  rotate: number;
  delay: number;
  accent: string;
  icon: React.ReactNode;
  platform: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        right,
        animation: `floaty ${6 + delay}s ease-in-out ${delay}s infinite`,
      }}
    >
      <div
        style={{
          width: 224,
          transform: `rotate(${rotate}deg)`,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "var(--shadow-3)",
          padding: 13,
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 11 }}>
          {icon}
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)" }}>{platform}</div>
            <div style={{ fontSize: 10.5, color: "var(--fg-faint)" }}>{sub}</div>
          </div>
          <span style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: accent }} />
        </div>
        {children}
      </div>
    </div>
  );
}

export default function PlatformSnapshots() {
  return (
    <div
      className="hidden xl:block theme-light"
      aria-hidden
      style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}
    >
      {/* ── Left side ─────────────────────────────────────────── */}
      <Card top={196} left={18} rotate={-5} delay={0} accent="#1877F2" icon={<FacebookIco />} platform="Facebook" sub="Lead Ad form">
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)", marginBottom: 3 }}>New lead captured</div>
        <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 10 }}>Rahul S. · &ldquo;Interested in a demo&rdquo;</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Pill text="New" bg="rgba(24,119,242,0.14)" color="#1877F2" />
          <span style={{ fontSize: 10, color: "var(--fg-faint)" }}>just now</span>
        </div>
      </Card>

      <Card top={430} left={62} rotate={4} delay={1.2} accent="#25D366" icon={<WhatsAppIco />} platform="WhatsApp" sub="Follow-up due">
        <div style={{
          fontSize: 11, color: "var(--fg)", background: "rgba(37,211,102,0.10)",
          borderRadius: "10px 10px 10px 2px", padding: "7px 9px", marginBottom: 10, lineHeight: 1.45,
        }}>
          Hi! Is the launch offer still available? 🙂
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Pill text="Reply now" bg="rgba(37,211,102,0.16)" color="#1FAE57" />
          <span style={{ fontSize: 10, color: "var(--fg-faint)" }}>2m ago ✓✓</span>
        </div>
      </Card>

      {/* ── Right side ────────────────────────────────────────── */}
      <Card top={206} right={22} rotate={5} delay={0.6} accent="#D62976" icon={<InstagramIco />} platform="Instagram" sub="DM enquiry">
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)", marginBottom: 3 }}>@priya.mehta</div>
        <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 10 }}>&ldquo;Saw your ad — how much? 👀&rdquo;</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Pill text="Enquiry" bg="rgba(214,41,118,0.14)" color="#D62976" />
          <span style={{ fontSize: 10, color: "var(--fg-faint)" }}>5m ago</span>
        </div>
      </Card>

      <Card top={438} right={58} rotate={-4} delay={1.8} accent="#0A66C2" icon={<LinkedInIco />} platform="LinkedIn" sub="New enquiry">
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)", marginBottom: 3 }}>Vikram Singh · Director</div>
        <div style={{ fontSize: 11, color: "var(--fg-muted)", marginBottom: 10 }}>&ldquo;Requesting a pricing deck.&rdquo;</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Pill text="Hot lead" bg="rgba(10,102,194,0.14)" color="#0A66C2" />
          <span style={{ fontSize: 10, color: "var(--fg-faint)" }}>12m ago</span>
        </div>
      </Card>
    </div>
  );
}
