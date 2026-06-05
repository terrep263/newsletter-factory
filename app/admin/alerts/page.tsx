"use client";
import { useEffect, useState } from "react";

type AlertEvent = { id: string; level: string; category: string; message: string; detail?: string; newsletterId?: string; ts: string; };

const levelColor: Record<string, string> = { info: "#004085", warn: "#856404", error: "#721c24", critical: "#fff" };
const levelBg: Record<string, string> = { info: "#cce5ff", warn: "#fff3cd", error: "#f8d7da", critical: "#721c24" };

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  function load() {
    setLoading(true);
    fetch("/api/admin/alerts").then((r) => r.json()).then((d) => { setAlerts(d.alerts ?? []); setLoading(false); }).catch(() => setLoading(false));
  }
  useEffect(load, []);

  const shown = filter === "all" ? alerts : alerts.filter((a) => a.level === filter);

  return (
    <main>
      <h2 style={{ color: "#0021A5", marginTop: 0 }}>Alerts</h2>
      <p style={{ color: "#555", marginTop: 0 }}>Recent alert events from the server. Newest first. Persisted to <code>data/alerts.json</code> (not durable across restarts without a mounted volume).</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <button onClick={load} style={{ padding: "4px 12px", cursor: "pointer" }}>Refresh</button>
        {["all", "critical", "error", "warn", "info"].map((lvl) => (
          <button key={lvl} onClick={() => setFilter(lvl)} style={{ padding: "3px 10px", cursor: "pointer", fontWeight: filter === lvl ? 700 : 400, border: `1px solid ${filter === lvl ? "#0021A5" : "#ccc"}`, borderRadius: 4, background: filter === lvl ? "#0021A5" : "#fff", color: filter === lvl ? "#fff" : "#333", fontSize: 12 }}>{lvl}</button>
        ))}
        <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>{shown.length} events</span>
      </div>
      {loading && <p>Loading…</p>}
      {!loading && shown.length === 0 && <p style={{ color: "#666" }}>No alert events{filter !== "all" ? ` at level "${filter}"` : ""}.</p>}
      <div>
        {shown.map((ev) => (
          <div key={ev.id} style={{ borderLeft: `4px solid ${levelColor[ev.level] ?? "#ccc"}`, padding: "8px 12px", marginBottom: 6, borderRadius: "0 6px 6px 0", background: levelBg[ev.level] ?? "#f9f9f9" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: levelColor[ev.level] ?? "#333", background: levelBg[ev.level] ?? "#eee", padding: "1px 6px", borderRadius: 4 }}>{ev.level}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{ev.category}</span>
              <span style={{ fontSize: 11, color: "#888", marginLeft: "auto" }}>{new Date(ev.ts).toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 13 }}>{ev.message}</div>
            {ev.detail && <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{ev.detail}</div>}
            {ev.newsletterId && <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>ID: {ev.newsletterId}</div>}
          </div>
        ))}
      </div>
    </main>
  );
}
