"use client";

import { useCallback, useEffect, useRef } from "react";
import { useState } from "react";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const DIGITS = "0123456789".split("");

/**
 * Dependency-free take on Magic UI's <HyperText>: scrambles a word through
 * random glyphs and "decrypts" it. Runs once on mount. With `hoverRupee` it
 * morphs into a random ₹ amount on hover (digits scramble through 0–9) and
 * reverts on mouse-leave; otherwise it just replays on hover. Inherits font /
 * color from its parent so it drops into headings.
 *
 * Props stay serializable so a Server Component can render it directly — no
 * function props across the client boundary.
 */
export default function HyperText({
  children,
  duration = 700,
  delay = 0,
  animateOnHover = true,
  hoverRupee = false,
  rupeeMin = 10000,
  rupeeMax = 99999,
  style,
}: {
  children: string;
  duration?: number;
  delay?: number;
  animateOnHover?: boolean;
  hoverRupee?: boolean;
  rupeeMin?: number;
  rupeeMax?: number;
  style?: React.CSSProperties;
}) {
  const text = children;
  const [display, setDisplay] = useState<string[]>(() => text.split(""));
  const rafRef = useRef<number | null>(null);
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const animateTo = useCallback(
    (target: string, onComplete?: () => void) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const chars = target.split("");
      const start = performance.now();

      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const revealed = progress * chars.length;
        setDisplay(
          chars.map((ch, i) => {
            if (i < revealed) return ch;
            if (/[0-9]/.test(ch)) return DIGITS[Math.floor(Math.random() * DIGITS.length)];
            if (/[a-zA-Z]/.test(ch)) return LETTERS[Math.floor(Math.random() * LETTERS.length)];
            return ch; // keep ₹, commas, spaces, punctuation steady
          })
        );
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          setDisplay(chars);
          onComplete?.();
        }
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [duration]
  );

  useEffect(() => {
    const t = setTimeout(() => animateTo(text), delay);
    return () => {
      clearTimeout(t);
      if (holdRef.current) clearTimeout(holdRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animateTo, text, delay]);

  function onEnter() {
    if (hoverRupee) {
      if (holdRef.current) clearTimeout(holdRef.current);
      const amount = Math.floor(Math.random() * (rupeeMax - rupeeMin + 1)) + rupeeMin;
      // Reveal the ₹ amount, hold briefly so it's readable, then morph back.
      animateTo(`₹${amount.toLocaleString("en-IN")}`, () => {
        holdRef.current = setTimeout(() => animateTo(text), 600);
      });
    } else if (animateOnHover) {
      animateTo(text);
    }
  }

  return (
    <span
      onMouseEnter={onEnter}
      style={{ display: "inline-block", position: "relative", whiteSpace: "pre", ...style }}
    >
      {/* Ghost reserves the resting word's width so surrounding text never shifts. */}
      <span aria-hidden style={{ visibility: "hidden" }}>{text}</span>
      <span style={{ position: "absolute", left: 0, top: 0 }}>{display.join("")}</span>
    </span>
  );
}
