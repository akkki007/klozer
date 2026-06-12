"use client";

import { useEffect, useState } from "react";
import { api, type OrgTreeNode } from "@/lib/api-client";

const ROLE_LABEL: Record<string, string> = {
  company_admin: "Company Admin",
  head: "Head",
  employee: "Employee",
};
const ROLE_COLOR: Record<string, string> = {
  company_admin: "#714B67",
  head: "#017E84",
  employee: "#F59E0B",
};

export default function OrgTreeClient({ token }: { token: string }) {
  const [tree, setTree] = useState<OrgTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setTree(await api.users.tree(token));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load hierarchy");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--fg-display)", letterSpacing: "-0.02em" }}>
        Organization
      </h1>
      <p style={{ fontSize: 14, color: "var(--fg-muted)", marginTop: 4, marginBottom: 24 }}>
        Reporting hierarchy across your company.
      </p>

      {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}
      {loading ? (
        <p style={{ color: "var(--fg-faint)", fontSize: 14 }}>Loading…</p>
      ) : tree.length === 0 ? (
        <p style={{ color: "var(--fg-faint)", fontSize: 14 }}>No users yet.</p>
      ) : (
        <div
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-4)",
            padding: 18,
          }}
        >
          {tree.map((node) => (
            <TreeNode key={node.id} node={node} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeNode({ node, depth }: { node: OrgTreeNode; depth: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 22 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 10px",
          borderRadius: "var(--radius-2)",
          borderLeft: depth > 0 ? "2px solid var(--border-hairline)" : undefined,
        }}
      >
        <button
          onClick={() => hasChildren && setOpen((o) => !o)}
          style={{
            width: 18,
            height: 18,
            border: "none",
            background: "transparent",
            cursor: hasChildren ? "pointer" : "default",
            color: "var(--fg-faint)",
            fontSize: 11,
          }}
        >
          {hasChildren ? (open ? "▼" : "▶") : "•"}
        </button>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: `${ROLE_COLOR[node.role] ?? "#888"}22`,
            color: ROLE_COLOR[node.role] ?? "#888",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {node.full_name.charAt(0).toUpperCase()}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
            {node.full_name}
            {node.status !== "active" && (
              <span style={{ fontSize: 10, color: "var(--fg-faint)", marginLeft: 8 }}>(inactive)</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-faint)" }}>
            {ROLE_LABEL[node.role] ?? node.role}
            {node.designation ? ` · ${node.designation}` : ""}
            {node.department ? ` · ${node.department}` : ""}
          </div>
        </div>
      </div>
      {open && hasChildren && (
        <div>
          {node.children.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
