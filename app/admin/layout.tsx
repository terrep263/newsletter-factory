import type { ReactNode } from "react";

const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "Control Center" },
  { href: "/admin/factory", label: "Factory" },
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/diagnostics", label: "Diagnostics" },
  { href: "/admin/newsletters", label: "Newsletters" },
  { href: "/admin/builder", label: "Builder" },
  { href: "/admin/preview", label: "Preview" },
  { href: "/admin/test-send", label: "Test Send" },
  { href: "/admin/approval", label: "Approval" },
  { href: "/admin/broadcast", label: "Broadcast" },
  { href: "/admin/alerts", label: "Alerts" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <nav style={{ background: "#111", padding: "8px 20px", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: 13 }}>
        <span style={{ color: "#fa0", fontWeight: 700, marginRight: 6 }}>ADMIN</span>
        {NAV.map((n) => (
          <a key={n.href} href={n.href} style={{ color: "#ccc", textDecoration: "none" }}>{n.label}</a>
        ))}
      </nav>
      <div style={{ padding: "24px 28px", maxWidth: 1060, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
