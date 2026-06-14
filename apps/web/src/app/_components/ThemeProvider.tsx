"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const STORAGE_KEY = "leadmax-landing-theme";

/**
 * Wraps the landing page, applies the `theme-dark` / `theme-light` token class,
 * and exposes a toggle. Defaults to dark (the landing's native look) and
 * remembers the visitor's choice in localStorage.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  function toggle() {
    setTheme((t) => {
      const next: Theme = t === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div
        className={theme === "dark" ? "theme-dark" : "theme-light"}
        style={{
          background: "var(--bg)",
          color: "var(--fg)",
          minHeight: "100vh",
          fontFamily: "var(--font-sans)",
          transition: "background 0.3s ease, color 0.3s ease",
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
