"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { api, type OrgTreeNode } from "@/lib/api-client";

/* ── layout constants ──────────────────────────────────────────────────────── */
const NODE_W = 220;
const NODE_H = 104;
const H_GAP = 32; // horizontal gap between sibling subtrees
const V_GAP = 76; // vertical gap between levels
const PAD = 80; // canvas padding around content

const ROLE: Record<string, { label: string; color: string }> = {
  company_admin: { label: "Company Admin", color: "#714B67" },
  head: { label: "Head", color: "#017E84" },
  employee: { label: "Employee", color: "#C77F2E" },
};

type Positioned = {
  node: OrgTreeNode;
  x: number;
  y: number;
  parent: Positioned | null;
};

/* Tidy tree layout: leaves take sequential slots, parents center over children. */
function layout(roots: OrgTreeNode[]): { nodes: Positioned[]; width: number; height: number } {
  const placed: Positioned[] = [];
  let cursor = 0;
  let maxDepth = 0;

  function assign(node: OrgTreeNode, depth: number, parent: Positioned | null): Positioned {
    maxDepth = Math.max(maxDepth, depth);
    const self: Positioned = { node, x: 0, y: depth * (NODE_H + V_GAP), parent };
    placed.push(self);

    if (!node.children || node.children.length === 0) {
      self.x = cursor * (NODE_W + H_GAP);
      cursor += 1;
    } else {
      const kids = node.children.map((c) => assign(c, depth + 1, self));
      const first = kids[0].x;
      const last = kids[kids.length - 1].x;
      self.x = (first + last) / 2; // center over children span
    }
    return self;
  }

  roots.forEach((r) => assign(r, 0, null));

  const maxX = placed.reduce((m, p) => Math.max(m, p.x), 0);
  const width = maxX + NODE_W + PAD * 2;
  const height = maxDepth * (NODE_H + V_GAP) + NODE_H + PAD * 2;
  // shift everything by PAD
  placed.forEach((p) => {
    p.x += PAD;
    p.y += PAD;
  });
  return { nodes: placed, width, height };
}

export default function OrgChart({
  token,
  currentUserId,
}: {
  token: string;
  currentUserId?: string;
}) {
  const [roots, setRoots] = useState<OrgTreeNode[] | null>(null);
  const [error, setError] = useState("");
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setRoots(await api.users.tree(token));
      } catch (err) {
        setError(err instanceof Error ? err.message.replace(/^API \d+:\s*/, "") : "Failed to load");
      }
    })();
  }, [token]);

  const { nodes, width, height } = useMemo(
    () => (roots && roots.length ? layout(roots) : { nodes: [], width: 0, height: 0 }),
    [roots]
  );

  /* Center the content horizontally on first render / data change. */
  const fit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp || !width) return;
    const s = Math.min(1, (vp.clientWidth - 32) / width);
    setScale(s);
    setTx((vp.clientWidth - width * s) / 2);
    setTy(24);
  }, [width]);

  useEffect(() => {
    fit();
  }, [fit]);

  /* Pan */
  function onMouseDown(e: React.MouseEvent) {
    drag.current = { x: e.clientX, y: e.clientY, tx, ty };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current) return;
    setTx(drag.current.tx + (e.clientX - drag.current.x));
    setTy(drag.current.ty + (e.clientY - drag.current.y));
  }
  function endDrag() {
    drag.current = null;
  }

  /* Zoom on wheel, anchored at cursor */
  function onWheel(e: React.WheelEvent) {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const next = Math.min(2, Math.max(0.3, scale * factor));
    // keep the point under the cursor fixed
    setTx(cx - (cx - tx) * (next / scale));
    setTy(cy - (cy - ty) * (next / scale));
    setScale(next);
  }

  const zoomBy = (f: number) => setScale((s) => Math.min(2, Math.max(0.3, s * f)));

  if (error)
    return <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>;
  if (!roots)
    return <p style={{ color: "var(--fg-faint)", fontSize: 14 }}>Loading hierarchy…</p>;
  if (!roots.length)
    return <p style={{ color: "var(--fg-faint)", fontSize: 14 }}>No hierarchy to display.</p>;

  return (
    <div
      style={{
        position: "relative",
        height: "72vh",
        minHeight: 420,
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-4)",
        overflow: "hidden",
        background:
          "var(--bg-soft, #f7f5f3) radial-gradient(circle, rgba(120,120,120,0.18) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Controls */}
      <div style={{ position: "absolute", top: 12, right: 12, zIndex: 5, display: "flex", gap: 6 }}>
        <CtrlBtn onClick={() => zoomBy(1.1)} label="+" />
        <CtrlBtn onClick={() => zoomBy(1 / 1.1)} label="−" />
        <CtrlBtn onClick={fit} label="Fit" wide />
      </div>

      {/* Legend */}
      <div
        style={{
          position: "absolute", bottom: 12, left: 12, zIndex: 5,
          display: "flex", gap: 14, padding: "7px 12px",
          background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-2)", fontSize: 11.5, color: "var(--fg-muted)",
          boxShadow: "var(--shadow-1)",
        }}
      >
        {Object.values(ROLE).map((r) => (
          <span key={r.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: r.color }} />
            {r.label}
          </span>
        ))}
      </div>

      {/* Viewport */}
      <div
        ref={viewportRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onWheel={onWheel}
        style={{ position: "absolute", inset: 0, cursor: drag.current ? "grabbing" : "grab" }}
      >
        <div
          style={{
            position: "absolute",
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "0 0",
            width,
            height,
          }}
        >
          {/* connectors */}
          <svg
            width={width}
            height={height}
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            {nodes
              .filter((p) => p.parent)
              .map((p) => {
                const sx = p.parent!.x + NODE_W / 2;
                const sy = p.parent!.y + NODE_H;
                const ex = p.x + NODE_W / 2;
                const ey = p.y;
                const midY = sy + V_GAP / 2;
                return (
                  <path
                    key={`${p.parent!.node.id}-${p.node.id}`}
                    d={`M ${sx} ${sy} L ${sx} ${midY} L ${ex} ${midY} L ${ex} ${ey}`}
                    fill="none"
                    stroke="var(--border, rgba(55,53,47,0.22))"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                  />
                );
              })}
          </svg>

          {/* nodes */}
          {nodes.map((p) => (
            <NodeCard key={p.node.id} p={p} isYou={p.node.id === currentUserId} />
          ))}
        </div>
      </div>
    </div>
  );
}

function NodeCard({ p, isYou }: { p: Positioned; isYou: boolean }) {
  const meta = ROLE[p.node.role] ?? { label: p.node.role, color: "#888" };
  const inactive = p.node.status !== "active";
  return (
    <div
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        width: NODE_W,
        height: NODE_H,
        boxSizing: "border-box",
        background: "var(--bg-elevated)",
        border: isYou ? `2px solid ${meta.color}` : "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-4)",
        boxShadow: isYou ? `0 0 0 4px ${meta.color}22, var(--shadow-2)` : "var(--shadow-1)",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        opacity: inactive ? 0.55 : 1,
      }}
    >
      {/* top accent strip via role color border-left */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: `${meta.color}1A`,
            color: meta.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {p.node.full_name.charAt(0).toUpperCase()}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: "var(--fg)",
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {p.node.full_name}
            {isYou && (
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 9,
                  fontWeight: 700,
                  color: meta.color,
                  background: `${meta.color}1A`,
                  padding: "1px 5px",
                  borderRadius: 999,
                  letterSpacing: "0.04em",
                }}
              >
                YOU
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 11,
              color: meta.color,
              fontWeight: 600,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {meta.label}
            {p.node.designation ? ` · ${p.node.designation}` : ""}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginTop: "auto",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono, ui-monospace, monospace)",
            fontSize: 11,
            color: "var(--fg-faint)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={p.node.employee_code ?? ""}
        >
          {p.node.employee_code ?? "—"}
        </span>
        {p.node.department && (
          <span
            style={{
              fontSize: 10.5,
              color: "var(--fg-faint)",
              background: "var(--bg-soft, #f1efec)",
              padding: "1px 7px",
              borderRadius: 999,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 96,
            }}
          >
            {p.node.department}
          </span>
        )}
      </div>
    </div>
  );
}

function CtrlBtn({ onClick, label, wide }: { onClick: () => void; label: string; wide?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 30,
        minWidth: wide ? 44 : 30,
        padding: wide ? "0 10px" : 0,
        borderRadius: "var(--radius-2)",
        border: "1px solid var(--border-hairline)",
        background: "var(--bg-elevated)",
        color: "var(--fg-muted)",
        fontSize: wide ? 12 : 16,
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "var(--shadow-1)",
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
}
