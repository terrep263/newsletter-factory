"use client";
import { useEffect, useState } from "react";

type DiagData = { liveBroadcast: boolean; rawSendBlocked: boolean; lettermanOk: boolean; approvalPassword: string; factoryUser: string; factoryPass: string; };

export default function BroadcastPage() {
  const [data, setData] = useState<DiagData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/admin/diagnostics").then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  return (
    <main>
      <h2 style={{ color: "#0021A5", marginTop: 0 }}>Broadcast Status</h2>
      <p style={{ color: "#555", marginTop: 0 }}>Read-only. No raw endpoint input. No one-click publish. Any real live-send goes through the <a href="/admin/approval">Approval</a> gate only.</p>
      {loading && <p>Loading…</p>}
      {data && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "16px 20px", maxWidth: 560 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ padding: "12px 16px", borderRadius: 8, marginBottom: 12, background: data.liveBroadcast ? "#fff3cd" : "#d4edda", border: `2px solid ${data.liveBroadcast ? "#ffc107" : "#28a745"}` }}>
              <strong style={{ fontSize: 16 }}>ENABLE_LIVE_BROADCAST = {data.liveBroadcast ? "true" : "false"}</strong>
              <p style={{ margin: "4px 0 0", fontSize: 13 }}>{data.liveBroadcast ? "Live broadcasting is ENABLED. GO approval can trigger real sends." : "Live broadcasting is LOCKED OFF. GO approval records workflow completion but does NOT fire real sends. Set ENABLE_LIVE_BROADCAST=true in environment variables to unlock."}</p>
            </div>
            {[
              { label: "Raw live-send (/newsletters/send-email/*) blocked", ok: data.rawSendBlocked, note: "Enforced in /api/admin/letterman/route.ts — cannot be bypassed from the raw console." },
              { label: "Letterman connection", ok: data.lettermanOk, note: data.lettermanOk ? "Read test passed" : "Read test failed — check token" },
              { label: "PUBLISH_APPROVAL_PASSWORD configured", ok: data.approvalPassword === "configured", note: data.approvalPassword === "configured" ? "GO gate active" : "Missing — GO is blocked server-side" },
              { label: "Auth gate (FACTORY_USER / FACTORY_PASS)", ok: data.factoryUser === "configured" && data.factoryPass === "configured", note: "Fail-closed when missing" },
            ].map(({ label, ok, note }) => (
              <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10, borderBottom: "1px solid #eee", paddingBottom: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: ok ? "#155724" : "#721c24", fontSize: 16, lineHeight: 1 }}>{ok ? "✓" : "✗"}</span>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 12, color: "#666" }}>{note}</div></div>
              </div>
            ))}
          </div>
          <div style={{ background: "#f8f9fa", borderRadius: 6, padding: "10px 14px", fontSize: 12, color: "#555" }}>
            <strong>To send live:</strong> use the <a href="/admin/approval">Approval page</a> to complete the GO workflow (preview + test-send + password + exact phrase + ENABLE_LIVE_BROADCAST=true). No other path triggers a real broadcast from this app.
          </div>
        </div>
      )}
    </main>
  );
}
