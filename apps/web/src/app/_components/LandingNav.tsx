"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const SECTIONS = [
  { label: "Home", id: "home" },
  { label: "How it works", id: "how" },
  { label: "Features", id: "features" },
  { label: "Pricing", id: "pricing" },
  { label: "Get in contact", id: "contact" },
];

function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
      <rect width="26" height="26" rx="6" fill="#714B67" />
      <path d="M8 18L13 8L18 18" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 14.5H16.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function LandingNav() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  // Tint helper that flips between white-on-dark and ink-on-light surfaces.
  const surface = (a: number) => (dark ? `rgba(255,255,255,${a})` : `rgba(55,53,47,${a})`);
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("home");
  // While a click-scroll is settling, ignore scroll-spy so the highlight stays
  // on the section the user actually clicked.
  const clickLockUntil = useRef(0);

  function handleNavClick(id: string) {
    setActive(id);
    clickLockUntil.current = Date.now() + 900;
  }

  useEffect(() => {
    let last = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > 8);

      // Hide when scrolling down (past a small threshold), show when scrolling up.
      if (y > last && y > 120) setHidden(true);
      else if (y < last) setHidden(false);
      last = y;

      // Keep the clicked section highlighted while the smooth scroll settles.
      if (Date.now() < clickLockUntil.current) return;

      // Active-section highlight: the section that most recently crossed the
      // nav line — i.e. the largest top still <= threshold. Order-independent,
      // so it doesn't matter how the nav links are ordered vs the DOM.
      let current = SECTIONS[0].id;
      let bestTop = -Infinity;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= 140 && top > bestTop) {
          bestTop = top;
          current = s.id;
        }
      }
      // Near the bottom of the page, force the last section active.
      if (window.innerHeight + y >= document.body.scrollHeight - 4) {
        current = SECTIONS[SECTIONS.length - 1].id;
      }
      setActive(current);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "31px 26px 13px",
        transform: hidden ? "translateY(-130%)" : "translateY(0)",
        transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1), background 0.3s ease, border-color 0.3s ease",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        background: dark
          ? (scrolled ? "rgba(15,15,15,0.6)" : "rgba(15,15,15,0.28)")
          : (scrolled ? "rgba(255,253,250,0.72)" : "rgba(255,253,250,0.4)"),
        borderBottom: `1px solid ${scrolled ? "var(--border-hairline)" : "transparent"}`,
      }}
    >
      {/* Left — brand */}
      <Link
        href="/"
        style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}
      >
        <LogoMark />
        <span
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: "var(--fg-display)",
            letterSpacing: "-0.02em",
            fontFamily: "var(--font-sans)",
          }}
        >
          LeadMax
        </span>
      </Link>

      {/* Center — floating pill */}
      <nav
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: 5,
          borderRadius: 14,
          background: surface(0.05),
          border: `1px solid ${surface(0.10)}`,
          boxShadow: dark
            ? "0 8px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)"
            : "0 8px 30px rgba(55,53,47,0.12), inset 0 1px 0 rgba(255,255,255,0.6)",
        }}
      >
        {SECTIONS.map((s) => {
          const isActive = active === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => handleNavClick(s.id)}
              className="nav-link"
              style={{
                padding: "8px 15px",
                borderRadius: 9,
                fontSize: 13.5,
                fontWeight: isActive ? 600 : 500,
                whiteSpace: "nowrap",
                textDecoration: "none",
                fontFamily: "var(--font-sans)",
                background: isActive ? surface(0.10) : "transparent",
                transition: "background 0.18s ease",
              }}
            >
              <span className="nav-roll">
                <span
                  className="roll-front"
                  style={{ color: isActive ? "var(--fg-display)" : "var(--fg-muted)" }}
                >
                  {s.label}
                </span>
                <span className="roll-back" aria-hidden>
                  {s.label}
                </span>
              </span>
            </a>
          );
        })}
      </nav>

      {/* Right — actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={toggle}
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          title={dark ? "Light mode" : "Dark mode"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 8,
            cursor: "pointer",
            color: "var(--fg-muted)",
            background: surface(0.05),
            border: `1px solid ${surface(0.12)}`,
            transition: "background 0.18s ease, color 0.18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = surface(0.12);
            e.currentTarget.style.color = "var(--fg-display)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = surface(0.05);
            e.currentTarget.style.color = "var(--fg-muted)";
          }}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
        <Link
          href="/login"
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--fg-muted)",
            textDecoration: "none",
            padding: "7px 14px",
            borderRadius: 8,
            border: `1px solid ${surface(0.12)}`,
            fontFamily: "var(--font-sans)",
          }}
        >
          Log in
        </Link>
        <Link
          href="/login"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
            textDecoration: "none",
            padding: "8px 18px",
            borderRadius: 8,
            background: "#714B67",
            fontFamily: "var(--font-sans)",
          }}
        >
          Get started free
        </Link>
      </div>
    </header>
  );
}
