"use client";
import { useEffect, useState } from "react";

type Newsletter = { _id?: string; id?: string; name?: string; status?: string; wordCount?: number; [k: string]: unknown };

export default function NewslettersPage() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true); setError("");
    fetch("/api/admin/newsletters").then((r) => r.json()).then((d) => {
      if (!d.ok) { setError(d.error ?? "Unknown error"); setLoading(false); return; }
      setNewsletters(d.newsletters ?? []);
      setLoading(false);
    }).catch((e) => { setError(String(e)); setLoading(false); });
  }
  useEffect(load, []);

  return (
    <main>
      <h2 style={{ color: "#0021A5", marginTop: 0 }}>Newsletters</h2>
      <p style={{ color: "#555", marginTop: 0 }}>Read from Letterman. No live-send available here. Use <a href="/admin/approval">Approval</a> for GO / NO GO.</p>
      <button onClick={load} style={{ marginBottom: 16, padding: "5px 14px", cursor: "pointer" }}>Refresh</button>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "#b00" }}>Error: {error}</p>}
      {!loading && !error && newsletters.length === 0 && (<p style={{ color: "#666" }}>No newsletters found in Letterman.</p>)}
      {newsletters.length > 0 && (
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>ID</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Name</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Status</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Words</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {newsletters.map((nl) => {
              const id = String(nl._id ?? nl.id ?? "");
              return (
                <tr key={id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: 11, color: "#888" }}>{id.slice(0, 12)}…</td>
                  <td style={{ padding: "6px 8px" }}>{String(nl.name ?? "—")}</td>
                  <td style={{ padding: "6px 8px" }}>{String(nl.status ?? "—")}</td>
                  <td style={{ padding: "6px 8px" }}>{nl.wordCount != null ? String(nl.wordCount) : "—"}</td>
                  <td style={{ padding: "6px 8px" }}>
                    <a href={`/admin/preview?id=${id}`} style={{ marginRight: 10, fontSize: 12 }}>Preview</a>
                    <a href={`/admin/test-send?id=${id}`} style={{ marginRight: 10, fontSize: 12 }}>Test Send</a>
                    <a href={`/admin/approval?id=${id}`} style={{ fontSize: 12 }}>Approval</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
