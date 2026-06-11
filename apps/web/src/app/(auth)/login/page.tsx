"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const router = useRouter();

  async function handleFacebook() {
    setFbLoading(true);
    setError("");
    await signIn("facebook", { callbackUrl: "/dashboard" });
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0F0F0F",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-sans, 'Inter', sans-serif)",
    }}>

      <div style={{
        position: "relative", width: "100%", maxWidth: 380, padding: "0 20px",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <svg width="32" height="32" viewBox="0 0 26 26" fill="none">
              <rect width="26" height="26" rx="6" fill="#714B67" />
              <path d="M8 18L13 8L18 18" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9.5 14.5H16.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              <defs>
                <linearGradient id="lm-login-grad" x1="0" y1="0" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#714B67" />
                  <stop offset="1" stopColor="#017E84" />
                </linearGradient>
              </defs>
            </svg>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>LeadMax</span>
          </div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>Sales execution platform for Indian field teams</p>
        </div>

        {/* Card */}
        <div style={{
          background: "#161616",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: "32px 28px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6, letterSpacing: "-0.02em" }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 28 }}>
            Sign in to your LeadMax account
          </p>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171", fontSize: 13, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* Facebook button */}
          <button
            onClick={handleFacebook}
            disabled={fbLoading}
            style={{
              width: "100%", padding: "13px 20px",
              borderRadius: 8, border: "none", cursor: "pointer",
              background: "#1877F2",
              color: "#fff", fontWeight: 600, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              opacity: fbLoading ? 0.7 : 1,
              transition: "opacity 0.15s",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            {fbLoading ? "Redirecting to Facebook..." : "Continue with Facebook"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          </div>

          {!showEmail ? (
            <button
              onClick={() => setShowEmail(true)}
              style={{
                width: "100%", padding: "12px 20px",
                borderRadius: 8, cursor: "pointer",
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.7)", fontWeight: 500, fontSize: 14,
              }}
            >
              Sign in with email
            </button>
          ) : (
            <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontWeight: 500 }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 7,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff", fontSize: 14, outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6, fontWeight: 500 }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 7,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff", fontSize: 14, outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "11px 20px",
                  borderRadius: 8, border: "none", cursor: "pointer",
                  background: "#714B67",
                  color: "#fff", fontWeight: 600, fontSize: 14,
                  opacity: loading ? 0.7 : 1, marginTop: 4,
                }}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}

          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 20 }}>
            No account?{" "}
            <Link href="/signup" style={{ color: "rgba(196,144,179,0.9)", textDecoration: "none", fontWeight: 500 }}>
              Create one
            </Link>
          </p>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 20, lineHeight: 1.6 }}>
          By signing in you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
