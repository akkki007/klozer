import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="theme-dark" style={{ background: "var(--bg)", color: "var(--fg)", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <Nav />
      <Hero />
      <LogoBar />
      <Features />
      <HowItWorks />
      <Testimonials />
      <CtaSection />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "#0F0F0F",
      borderBottom: "1px solid var(--border)",
      padding: "0 40px", height: 60,
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LogoMark />
        <span style={{ fontWeight: 700, fontSize: 17, color: "var(--fg-display)", letterSpacing: "-0.02em" }}>LeadMax</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 32, fontSize: 14, color: "var(--fg-muted)" }}>
        <a href="#features" style={{ color: "var(--fg-muted)", textDecoration: "none" }}>Features</a>
        <a href="#how" style={{ color: "var(--fg-muted)", textDecoration: "none" }}>How it works</a>
        <a href="#pricing" style={{ color: "var(--fg-muted)", textDecoration: "none" }}>Pricing</a>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/login" style={{
          fontSize: 14, color: "var(--fg-muted)", textDecoration: "none", padding: "6px 14px",
          borderRadius: 6, border: "1px solid var(--border)"
        }}>
          Log in
        </Link>
        <Link href="/login" style={{
          fontSize: 14, fontWeight: 600, color: "#fff", textDecoration: "none",
          padding: "7px 18px", borderRadius: 6,
          background: "#714B67",
        }}>
          Get started free
        </Link>
      </div>
    </nav>
  );
}

function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect width="26" height="26" rx="6" fill="#714B67" />
      <path d="M8 18L13 8L18 18" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 14.5H16.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function Hero() {
  return (
    <section style={{
      padding: "120px 40px 100px",
      textAlign: "center",
    }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "5px 14px", borderRadius: 999,
          border: "1px solid var(--border)",
          background: "rgba(255,255,255,0.04)",
          fontSize: 12, fontWeight: 500, color: "#1AB8BE",
          marginBottom: 32, letterSpacing: "0.04em"
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1AB8BE", display: "inline-block" }} />
          Built for India&apos;s field sales teams
        </div>

        <h1 style={{
          fontSize: "clamp(48px, 7vw, 80px)", fontWeight: 700,
          lineHeight: 1.05, letterSpacing: "-0.03em",
          color: "#FFFFFF", marginBottom: 24,
        }}>
          Close more deals.{" "}
          <span style={{ color: "#C490B3" }}>
            Lose fewer leads.
          </span>
        </h1>

        <p style={{
          fontSize: 18, color: "var(--fg-muted)", maxWidth: 540, margin: "0 auto 40px",
          lineHeight: 1.65
        }}>
          LeadMax captures leads from Facebook Ads, auto-assigns them to your team, and keeps every WhatsApp + call follow-up on track — all in one place.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "13px 28px", borderRadius: 8,
            background: "#1877F2",
            color: "#fff", fontWeight: 600, fontSize: 15, textDecoration: "none",
          }}>
            <FacebookIcon />
            Continue with Facebook
          </Link>
          <a href="#how" style={{
            display: "inline-flex", alignItems: "center",
            padding: "13px 28px", borderRadius: 8,
            border: "1px solid var(--border)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--fg)", fontWeight: 500, fontSize: 15, textDecoration: "none",
          }}>
            See how it works →
          </a>
        </div>

        <p style={{ fontSize: 12, color: "var(--fg-faint)", marginTop: 16 }}>
          Free to start · No credit card required
        </p>
      </div>

      {/* Dashboard mockup */}
      <div style={{
        maxWidth: 900, margin: "72px auto 0",
        borderRadius: 12, overflow: "hidden",
        border: "1px solid var(--border)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
      }}>
        <DashboardMockup />
      </div>
    </section>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function DashboardMockup() {
  const leads = [
    { name: "Rahul Sharma", phone: "+91 98765 43210", source: "FB Ad", status: "New", time: "2m ago" },
    { name: "Priya Mehta", phone: "+91 87654 32109", source: "FB Ad", status: "Called", time: "14m ago" },
    { name: "Vikram Singh", phone: "+91 76543 21098", source: "Manual", status: "Interested", time: "1h ago" },
    { name: "Anita Patel", phone: "+91 65432 10987", source: "FB Ad", status: "Follow-up", time: "2h ago" },
    { name: "Deepak Kumar", phone: "+91 54321 09876", source: "FB Ad", status: "Closed", time: "Yesterday" },
  ];
  const statusColors: Record<string, { bg: string; text: string }> = {
    New:       { bg: "rgba(26,184,190,0.15)", text: "#1AB8BE" },
    Called:    { bg: "rgba(155,107,138,0.15)", text: "#C490B3" },
    Interested:{ bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
    "Follow-up":{ bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
    Closed:    { bg: "rgba(99,102,241,0.15)", text: "#818cf8" },
  };

  return (
    <div style={{ background: "#111", color: "#e6e6e5", fontFamily: "var(--font-sans)" }}>
      {/* Top bar */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 8 }}>
        {["#E05757", "#E0A557", "#57E085"].map((c) => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
        ))}
        <span style={{ marginLeft: 12, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>LeadMax — Lead Pipeline</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr" }}>
        {/* Sidebar */}
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)", padding: "16px 12px", background: "#0D0D0D" }}>
          {[
            { icon: "⚡", label: "Today's Plan", active: false },
            { icon: "👥", label: "Leads", active: true },
            { icon: "📞", label: "Call Log", active: false },
            { icon: "💬", label: "WhatsApp", active: false },
            { icon: "📊", label: "Analytics", active: false },
            { icon: "⚙️", label: "Integrations", active: false },
          ].map((item) => (
            <div key={item.label} style={{
              padding: "7px 10px", borderRadius: 5, marginBottom: 2, fontSize: 12,
              display: "flex", alignItems: "center", gap: 8,
              background: item.active ? "rgba(113,75,103,0.2)" : "transparent",
              color: item.active ? "#C490B3" : "rgba(255,255,255,0.45)",
              fontWeight: item.active ? 500 : 400,
            }}>
              <span>{item.icon}</span>{item.label}
            </div>
          ))}
        </div>
        {/* Main */}
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>All Leads</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>5 leads · synced 2m ago from Facebook</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ padding: "5px 12px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Filter</div>
              <div style={{ padding: "5px 12px", borderRadius: 5, background: "#714B67", fontSize: 11, color: "#fff", fontWeight: 500 }}>+ Add lead</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 0.8fr 0.8fr 0.7fr", gap: 8, padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 6 }}>
            {["Name", "Phone", "Source", "Status", "Time"].map((h) => (
              <div key={h} style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
            ))}
          </div>
          {leads.map((lead) => (
            <div key={lead.name} style={{
              display: "grid", gridTemplateColumns: "2fr 1.5fr 0.8fr 0.8fr 0.7fr", gap: 8,
              padding: "9px 8px", borderRadius: 5, marginBottom: 2,
            }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#e6e6e5" }}>{lead.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>{lead.phone}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{lead.source}</div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{
                  fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 99,
                  background: statusColors[lead.status].bg,
                  color: statusColors[lead.status].text,
                }}>
                  {lead.status}
                </span>
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{lead.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogoBar() {
  const brands = ["Tata Group", "Mahindra", "Reliance", "HDFC", "Bajaj", "Info Edge"];
  return (
    <div style={{
      padding: "40px 40px",
      borderTop: "1px solid var(--border)",
      borderBottom: "1px solid var(--border)",
      background: "#161616",
    }}>
      <p style={{ textAlign: "center", fontSize: 12, color: "var(--fg-faint)", marginBottom: 24, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Trusted by sales teams across India
      </p>
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        gap: 48, flexWrap: "wrap",
      }}>
        {brands.map((b) => (
          <div key={b} style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-faint)", letterSpacing: "-0.01em" }}>{b}</div>
        ))}
      </div>
    </div>
  );
}

function Features() {
  const items = [
    {
      icon: "⚡",
      color: "#714B67",
      title: "Auto-capture from Facebook Ads",
      desc: "Every lead from your Facebook Lead Ad forms lands in LeadMax in seconds — no manual CSV exports, no copy-paste.",
    },
    {
      icon: "📞",
      color: "#017E84",
      title: "Track every call & outcome",
      desc: "Log calls, set outcomes, and schedule callbacks. Your manager sees exactly where each lead stands in real time.",
    },
    {
      icon: "💬",
      color: "#128C7E",
      title: "Follow up on WhatsApp",
      desc: "Send approved WhatsApp templates directly from LeadMax. Track replies and keep the conversation going.",
    },
    {
      icon: "🎯",
      color: "#B45309",
      title: "Smart lead distribution",
      desc: "Round-robin, territory-based, or skill-matched — automatically assign new leads to the right rep the moment they arrive.",
    },
    {
      icon: "📊",
      color: "#4338CA",
      title: "Daily sales analytics",
      desc: "See conversion rates, average response time, and team leaderboards at a glance. Know what's working.",
    },
    {
      icon: "🔔",
      color: "#B91C1C",
      title: "Never miss a follow-up",
      desc: "Automated reminders push to your reps' phones when a follow-up is due. No more leads going cold.",
    },
  ];

  return (
    <section id="features" style={{ padding: "100px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#C490B3", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
            Everything you need
          </div>
          <h2 style={{
            fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 700,
            lineHeight: 1.1, letterSpacing: "-0.025em",
            color: "#FFFFFF", marginBottom: 16,
          }}>
            Built for teams that move fast
          </h2>
          <p style={{ fontSize: 16, color: "var(--fg-muted)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
            From lead capture to deal close — every touchpoint covered so your reps spend time selling, not administrating.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {items.map((item) => (
            <div key={item.title} style={{
              padding: "28px 24px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "#161616",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 8, marginBottom: 18,
                background: item.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 17,
              }}>
                {item.icon}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#FFFFFF", marginBottom: 8, letterSpacing: "-0.01em" }}>
                {item.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.6 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Connect your Facebook Page",
      desc: "One-click OAuth connects your Facebook Business Page. LeadMax automatically subscribes to your Lead Ad webhooks.",
    },
    {
      num: "02",
      title: "Leads flow in automatically",
      desc: "The moment someone fills your Lead Ad form, it appears in LeadMax and gets assigned to the right rep on your team.",
    },
    {
      num: "03",
      title: "Call, WhatsApp, close",
      desc: "Reps get a daily plan of leads to action. Every call and WhatsApp is logged. Managers see the whole pipeline.",
    },
  ];

  return (
    <section id="how" style={{ padding: "100px 40px", background: "#161616" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#1AB8BE", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
            How it works
          </div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.025em", color: "#FFFFFF" }}>
            Up and running in 5 minutes
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {steps.map((step, i) => (
            <div key={step.num} style={{
              display: "grid", gridTemplateColumns: "80px 1fr",
              gap: 32, alignItems: "flex-start",
              padding: "32px 0",
              borderBottom: i < steps.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
            }}>
              <div style={{
                fontSize: 36, fontWeight: 800, lineHeight: 1,
                letterSpacing: "-0.04em",
                color: "#714B67",
              }}>
                {step.num}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#FFFFFF", marginBottom: 8, letterSpacing: "-0.01em" }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.65 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const quotes = [
    {
      text: "We were losing 30% of leads because reps forgot to follow up. LeadMax cut that to near zero in the first week.",
      author: "Rajesh Nair",
      role: "VP Sales, PropTech startup, Pune",
    },
    {
      text: "The Facebook integration is seamless. Leads hit our reps' phones within seconds of someone filling the form.",
      author: "Sunita Kapoor",
      role: "Sales Manager, EduTech company, Mumbai",
    },
    {
      text: "Our team runs on WhatsApp. Having LeadMax log every message and set the next follow-up automatically is a game changer.",
      author: "Mohammed Farouk",
      role: "Director, NBFC distributor, Hyderabad",
    },
  ];

  return (
    <section style={{ padding: "100px 40px", background: "#0F0F0F" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, letterSpacing: "-0.025em", color: "#FFFFFF" }}>
            Teams love LeadMax
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {quotes.map((q) => (
            <div key={q.author} style={{
              padding: "28px 24px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "#161616",
            }}>
              <div style={{ fontSize: 24, color: "#714B67", marginBottom: 16, lineHeight: 1 }}>&ldquo;</div>
              <p style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.65, marginBottom: 20 }}>{q.text}</p>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>{q.author}</div>
              <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{q.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section style={{ padding: "100px 40px", background: "#161616" }}>
      <div style={{
        maxWidth: 700, margin: "0 auto", textAlign: "center",
        padding: "60px 40px",
        borderRadius: 16,
        border: "1px solid rgba(113,75,103,0.4)",
        background: "#1A1117",
      }}>
        <h2 style={{
          fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700,
          letterSpacing: "-0.025em", color: "#FFFFFF", marginBottom: 16,
        }}>
          Start closing deals today
        </h2>
        <p style={{ fontSize: 15, color: "var(--fg-muted)", marginBottom: 36, lineHeight: 1.65 }}>
          Connect your Facebook Page, invite your team, and watch leads flow in automatically. No setup fee, no contracts.
        </p>
        <Link href="/login" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "13px 32px", borderRadius: 8,
          background: "#1877F2",
          color: "#fff", fontWeight: 600, fontSize: 15, textDecoration: "none",
        }}>
          <FacebookIcon />
          Get started with Facebook
        </Link>
        <p style={{ fontSize: 12, color: "var(--fg-faint)", marginTop: 16 }}>
          Free for your first 30 days · No credit card needed
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid var(--border-hairline)",
      padding: "40px",
      background: "#0F0F0F",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LogoMark />
        <span style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF" }}>LeadMax</span>
      </div>
      <div style={{ display: "flex", gap: 24, fontSize: 13, color: "var(--fg-muted)" }}>
        <a href="#" style={{ color: "var(--fg-muted)", textDecoration: "none" }}>Privacy</a>
        <a href="#" style={{ color: "var(--fg-muted)", textDecoration: "none" }}>Terms</a>
        <a href="#" style={{ color: "var(--fg-muted)", textDecoration: "none" }}>Contact</a>
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-faint)" }}>© 2026 LeadMax. All rights reserved.</div>
    </footer>
  );
}
