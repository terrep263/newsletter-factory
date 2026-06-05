"use client";
import { useEffect, useState } from "react";

type DiagData = { token: string; baseUrl: string; userAgentApplied: boolean; factoryUser: string; factoryPass: string; approvalPassword: string; liveBroadcast: boolean; rawSendBlocked: boolean; lettermanOk: boolean; lettermanError?: string; newsletterCount?: number; issues: string[]; ts: string; };

export default function DiagnosticsPage() {
  const [data, setData] = useState<DiagData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true); setError("");
    fetch("/api/admin/diagnostics").then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch((e) => { setError(String(e)); setLoading(false); });
  }
  useEffect(load, []);

  const row = (label: string, value: string | boolean, ok?: boolean) => {
    const display = typeof value === "boolean" ? (value ? "Yes" : "No") : value;
    const color = ok === undefined ? "#555" : ok ? "#155724" : "#721c24";
    return (
      <tr key={label} style={{ borderBottom: "1px solid #eee" }}>
        <td style={{ padding: "6px 0", width: 280, fontSize: 13, fontWeight: 600 }}>{label}</td>
        <td style={{ padding: "6px 8px", fontSize: 13, color }}>{display}</td>
      </tr>
    );
  };

  return (
    <main>
      <h2 style={{ color: "#0021A5", marginTop: 0 }}>Diagnostics</h2>
      <p style={{ color: "#555", marginTop: 0 }}>Read-only. Secrets are never shown — only present/missing status.</p>
      <button onClick={load} style={{ marginBottom: 16, padding: "5px 14px", cursor: "pointer" }}>Refresh</button>
      {loading && <p>Running diagnostics…</p>}
      {error && <p style={{ color: "#b00" }}>Error: {error}</p>}
      {data && (
        <>
          <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 20 }}>
            <tbody>
              {row("LETTERMAN_TOKEN", data.token === "present" ? "Present" : "Missing", data.token === "present")}
              {row("LETTERMAN_BASE_URL", data.baseUrl)}
              {row("User-Agent applied", data.userAgentApplied, data.userAgentApplied)}
              {row("FACTORY_USER", data.factoryUser === "configured" ? "Configured" : "Missing", data.factoryUser === "configured")}
              {row("FACTORY_PASS", data.factoryPass === "configured" ? "Configured" : "Missing", data.factoryPass === "configured")}
              {row("PUBLISH_APPROVAL_PASSWORD", data.approvalPassword === "configured" ? "Configured" : "Missing — GO blocked", data.approvalPassword === "configured")}
              {row("ENABLE_LIVE_BROADCAST", data.liveBroadcast ? "true — live sending enabled" : "false — locked off", !data.liveBroadcast)}
              {row("Raw live-send blocked (/newsletters/send-email/*)", data.rawSendBlocked ? "Yes — server enforced" : "No", data.rawSendBlocked)}
              {row("Letterman read test", data.lettermanOk ? `Passed (${data.newsletterCount ?? "?"} newsletters)` : (data.lettermanError ?? "Failed"), data.lettermanOk)}
            </tbody>
          </table>
          {data.issues.length > 0 ? (
            <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 6, padding: "10px 14px", marginBottom: 12 }}><strong>Issues found:</strong><ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{data.issues.map((iss, i) => <li key={i} style={{ fontSize: 13 }}>{iss}</li>)}</ul></div>
          ) : (
            <div style={{ background: "#d4edda", border: "1px solid #28a745", borderRadius: 6, padding: "10px 14px", marginBottom: 12, fontSize: 13 }}>No configuration issues detected.</div>
          )}
          <p style={{ fontSize: 12, color: "#999" }}>Last checked: {new Date(data.ts).toLocaleString()}</p>
        </>
      )}
    </main>
  );
}
