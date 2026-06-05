"use client";
import { useEffect, useState } from "react";

type Diag = { token: string; lettermanOk: boolean; lettermanError?: string; newsletterCount?: number; liveBroadcast: boolean; approvalPassword: string; factoryUser: string; factoryPass: string; issues: string[]; };
type Approval = { newsletterId: string; newsletterTitle?: string; approvalStatus: string; testSendCompletedAt?: string; updatedAt: string };

export default function DashboardPage() {
  const [diag, setDiag] = useState<Diag | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/diagnostics").then((r) => r.json()),
      fetch("/api/admin/approval").then((r) => r.json()),
      fetch("/api/admin/alerts").then((r) => r.json()),
    ]).then(([d, a, al]) => {
      setDiag(d);
      setApprovals(a.approvals ?? []);
      setAlertCount((al.alerts ?? []).filter((e: { level: string }) => e.level === "error" || e.level === "critical").length);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const pending = approvals.filter((a) => a.approvalStatus === "pending").length;
  const lastTestSend = approvals.filter((a) => a.testSendCompletedAt).sort((a, b) => b.testSendCompletedAt!.localeCompare(a.testSendCompletedAt!)).at(0);

  const pill = (label: string, ok: boolean) => (
    <span key={label} style={{ display: "inline-block", padding: "2px 10px", marginRight: 6, marginBottom: 4, borderRadius: 12, fontSize: 12, fontWeight: 600, background: ok ? "#d4edda" : "#f8d7da", color: ok ? "#155724" : "#721c24" }}>{label}</span>
  );

  if (loading) return <p>Loading dashboard…</p>;

  return (
    <main>
      <h2 style={{ color: "#0021A5", marginTop: 0 }}>Dashboard</h2>
      <p style={{ color: "#555", marginTop: 0 }}>Read-only operational overview.</p>
      <h4 style={{ marginBottom: 6 }}>System Status</h4>
      <div style={{ marginBottom: 16 }}>
        {diag && <>{pill("Token " + (diag.token === "present" ? "OK" : "MISSING"), diag.token === "present")}
        {pill("Letterman " + (diag.lettermanOk ? "OK" : "FAIL"), diag.lettermanOk)}
        {pill("Auth " + (diag.factoryUser === "configured" && diag.factoryPass === "configured" ? "OK" : "OPEN"), diag.factoryUser === "configured" && diag.factoryPass === "configured")}
        {pill("Approval PW " + (diag.approvalPassword === "configured" ? "OK" : "MISSING"), diag.approvalPassword === "configured")}
        {pill("Broadcast " + (diag.liveBroadcast ? "ENABLED" : "LOCKED"), !diag.liveBroadcast)}</>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Newsletters (Letterman)", value: diag?.newsletterCount != null ? diag.newsletterCount : "—" },
          { label: "Pending approvals", value: pending },
          { label: "Total tracked", value: approvals.length },
          { label: "Recent errors/criticals", value: alertCount },
        ].map((stat) => (
          <div key={stat.label} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "14px 16px" }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#0021A5" }}>{String(stat.value)}</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>
      {lastTestSend && (<p style={{ fontSize: 13, color: "#555" }}>Last test-send: <strong>{lastTestSend.newsletterTitle ?? lastTestSend.newsletterId}</strong> at {new Date(lastTestSend.testSendCompletedAt!).toLocaleString()}</p>)}
      {diag?.lettermanError && (<div style={{ background: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: 6, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>Letterman error: {diag.lettermanError}</div>)}
      {diag && diag.issues.length > 0 && (<div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 6, padding: "8px 12px", fontSize: 13 }}><strong>Blockers / warnings:</strong><ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{diag.issues.map((iss, i) => <li key={i}>{iss}</li>)}</ul></div>)}
      {pending > 0 && (<p style={{ marginTop: 16 }}><a href="/admin/approval" style={{ color: "#0021A5" }}>→ {pending} newsletter{pending !== 1 ? "s" : ""} awaiting approval</a></p>)}
    </main>
  );
}
