"use client";

import { useId } from "react";

/**
 * Dependency-free take on Magic UI's <DotPattern>: a full-bleed SVG grid of
 * dots, absolutely positioned to fill its (relative) parent. Dots use the
 * theme's border token so they read on light and dark, and a radial mask fades
 * them toward the edges so they sit quietly behind the heading.
 */
export default function DotPattern({
  width = 20,
  height = 20,
  cr = 1,
  style,
}: {
  width?: number;
  height?: number;
  cr?: number;
  style?: React.CSSProperties;
}) {
  const id = useId();
  return (
    <svg
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        color: "var(--border)",
        maskImage: "radial-gradient(ellipse 45% 36% at 50% 30%, #000 30%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(ellipse 45% 36% at 50% 30%, #000 30%, transparent 80%)",
        ...style,
      }}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse">
          <circle cx={width / 2} cy={height / 2} r={cr} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
