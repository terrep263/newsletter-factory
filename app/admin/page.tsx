"use client";
import { useEffect, useState } from "react";

type Diag = {
  token: string; factoryUser: string; factoryPass: string; approvalPassword: string;
  liveBroadcast: boolean; rawSendBlocked: boolean; lettermanOk: boolean;
  lettermanError?: string; issues: string[];
};
type Approval = { newsletterId: string; approvalStatus: string };

const s = {
  h1: { color: "#0021A5", marginTop: 0 } as React.CSSProperties,
  card: { border: "1px solid #ddd", borderRadius: 8, padding: "12px 16px", marginBottom: 12, textDecoration: "none", color: "inherit", display: "block" } as React.CSSProperties,
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 10 } as React.CSSProperties,
  warn: { background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 6, padding: "10px 14px", marginBottom: 14, fontSize: 13 } as React.CSSProperties,
  ok: { background: "#d4edda", border: "1px solid #28a745", borderRadius: 6, padding: "10px 14px", marginBottom: 14, fontSize: 13 } as React.CSSProperties,
  row: { borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 10, padding: "5px 0" } as React.CSSProperties,
};

function Badge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span style={{ padding: "1px 7px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: ok ? "#d4edda" : "#f8d7da", color: ok ? "#155724" : "#721c24" }}>
      {label ?? (ok ? "OK" : "WARN")}
    </span>
  );
}

export default function AdminControlCenter() {
  const [diag, setDiag] = useState<Diag | null>(null);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/diagnostics").then((r) => r.json()),
      fetch("/api/admin/approval").then((r) => r.json()),
    ]).then(([d, a]) => {
      setDiag(d);
      const approvals: Approval[] = a.approvals ?? [];
      setPending(approvals.filter((x) => x.approvalStatus === "pending").length);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <main>
      <h1 style={s.h1}>Control Center</h1>
      <p style={{ color: "#555", marginTop: 0 }}>Safety posture and operational status. All Letterman API calls are server-side. LETTERMAN_TOKEN and PUBLISH_APPROVAL_PASSWORD never reach the browser.</p>
      {loading && <p>Loading status…</p>}
      {pending > 0 && (
        <div style={s.ok}><strong>{pending} newsletter{pending !== 1 ? "s" : ""} awaiting GO / NO GO.</strong> <a href="/admin/approval">Review now →</a></div>
      )}
      {diag && (
        <>
          <h3 style={{ marginBottom: 8 }}>Safety Posture</h3>
          <div style={{ marginBottom: 16 }}>
            {[
              { label: "LETTERMAN_TOKEN", ok: diag.token === "present", note: diag.token === "present" ? "Present" : "Missing — all API calls will fail" },
              { label: "Auth gate (FACTORY_USER / FACTORY_PASS)", ok: diag.factoryUser === "configured" && diag.factoryPass === "configured", note: "Fail-closed on missing credentials" },
              { label: "PUBLISH_APPROVAL_PASSWORD", ok: diag.approvalPassword === "configured", note: diag.approvalPassword === "configured" ? "Configured — GO is unblocked" : "Missing — GO is blocked" },
              { label: "Raw live-send blocked", ok: diag.rawSendBlocked, note: "Enforced server-side in /api/admin/letterman" },
              { label: "Letterman connection", ok: diag.lettermanOk, note: diag.lettermanOk ? "Read test passed" : (diag.lettermanError ?? "Failed") },
            ].map(({ label, ok, note }) => (
              <div key={label} style={s.row}>
                <span style={{ minWidth: 300, fontSize: 13 }}><strong>{label}</strong></span>
                <Badge ok={ok} />
                <span style={{ color: "#666", fontSize: 12 }}>{note}</span>
              </div>
            ))}
            <div style={s.row}>
              <span style={{ minWidth: 300, fontSize: 13 }}><strong>ENABLE_LIVE_BROADCAST</strong></span>
              <span style={{ padding: "1px 7px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: diag.liveBroadcast ? "#fff3cd" : "#d4edda", color: diag.liveBroadcast ? "#856404" : "#155724" }}>{diag.liveBroadcast ? "ENABLED" : "LOCKED OFF"}</span>
              <span style={{ color: "#666", fontSize: 12 }}>{diag.liveBroadcast ? "Live broadcasting active" : "Set ENABLE_LIVE_BROADCAST=true to allow real sends"}</span>
            </div>
          </div>
          {diag.issues.length > 0 && (
            <div style={s.warn}><strong>Configuration issues:</strong><ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{diag.issues.map((iss, i) => <li key={i}>{iss}</li>)}</ul></div>
          )}
        </>
      )}
      <h3>Admin Compartments</h3>
      <div style={s.grid}>
        {[
          { href: "/admin/dashboard", label: "Dashboard", desc: "Operational overview — counts, status, blockers" },
          { href: "/admin/diagnostics", label: "Diagnostics", desc: "Environment checks and Letterman connection test" },
          { href: "/admin/newsletters", label: "Newsletters", desc: "List and inspect newsletters from Letterman" },
          { href: "/admin/builder", label: "Builder", desc: "Create newsletter shells and add content sections" },
          { href: "/admin/preview", label: "Preview", desc: "Retrieve and review newsletter content" },
          { href: "/admin/test-send", label: "Test Send", desc: "Send test email — never live broadcast" },
          { href: "/admin/approval", label: "Approval", desc: "GO / NO GO queue — requires password + phrase" },
          { href: "/admin/broadcast", label: "Broadcast", desc: "Broadcast lock status — read-only" },
          { href: "/admin/alerts", label: "Alerts", desc: "Recent alerts, failures, and blocked attempts" },
        ].map((c) => (
          <a key={c.href} href={c.href} style={s.card}>
            <strong style={{ color: "#0021A5", display: "block", marginBottom: 4 }}>{c.label}</strong>
            <span style={{ fontSize: 12, color: "#666" }}>{c.desc}</span>
          </a>
        ))}
      </div>
    </main>
  );
}
