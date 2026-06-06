"use client";
import { useEffect, useState } from "react";

type Pub = { id: string; name: string; draftDay: number; sendDay: string; pillars: string[] };
type BuildResult = {
  ok: boolean; publication: string; newsletterId?: string; newsletterName?: string;
  totalStories: number; sections: { pillar: string; label: string; count: number }[];
  written: number; notes: string[]; error?: string;
};
type Preview = { ok: boolean; publication: string; total: number; byPillar: Record<string, { title: string; link: string; source: string }[]> };

const card: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 8, padding: "16px 18px", marginBottom: 16 };
const btn: React.CSSProperties = { padding: "7px 16px", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, marginRight: 8 };

export default function FactoryPage() {
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [busy, setBusy] = useState<string>("");
  const [preview, setPreview] = useState<Record<string, Preview>>({});
  const [result, setResult] = useState<Record<string, BuildResult>>({});

  useEffect(() => {
    fetch("/api/factory/build").then((r) => r.json()).then((d) => setPubs(d.publications ?? [])).catch(() => {});
  }, []);

  async function runPreview(id: string) {
    setBusy(id + ":preview");
    const d = await fetch(`/api/factory/build?preview=${id}`).then((r) => r.json()).catch(() => null);
    setBusy("");
    if (d) setPreview((p) => ({ ...p, [id]: d }));
  }

  async function runBuild(id: string) {
    setBusy(id + ":build");
    const d = await fetch("/api/factory/build", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicationId: id }) }).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));
    setBusy("");
    setResult((r) => ({ ...r, [id]: d }));
  }

  return (
    <main>
      <h2 style={{ color: "#0021A5", marginTop: 0 }}>Factory</h2>
      <p style={{ color: "#555", marginTop: 0 }}>Run a publication&apos;s discovery, then Letterman writes each local story (grounded in the source, no invented facts) into a draft filed under the publication. Review and approve under <a href="/admin/approval">Approval</a>.</p>
      {pubs.length === 0 && <p>Loading publications\u2026</p>}
      {pubs.map((p) => (
        <div key={p.id} style={card}>
          <h3 style={{ margin: "0 0 4px" }}>{p.name}</h3>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#777" }}>Draft day {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][p.draftDay]} \u00b7 sends {p.sendDay} \u00b7 {p.pillars.length} pillars</p>
          <button style={{ ...btn, background: "#eee", color: "#222" }} onClick={() => runPreview(p.id)} disabled={busy.startsWith(p.id)}>
            {busy === p.id + ":preview" ? "Scanning\u2026" : "Preview discovery"}
          </button>
          <button style={{ ...btn, background: "#0021A5", color: "#fff" }} onClick={() => runBuild(p.id)} disabled={busy.startsWith(p.id)}>
            {busy === p.id + ":build" ? "Building draft\u2026" : "Build this week's draft"}
          </button>

          {preview[p.id] && (
            <div style={{ marginTop: 14, fontSize: 13 }}>
              <strong>{preview[p.id].total} qualifying stories</strong>
              {Object.entries(preview[p.id].byPillar).map(([k, items]) => (
                <div key={k} style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 600 }}>{k} ({items.length})</div>
                  {items.map((it, i) => (
                    <div key={i} style={{ color: "#444", marginLeft: 10 }}>\u2022 {it.title} <span style={{ color: "#999" }}>{it.source}</span></div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {result[p.id] && (
            <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 6, fontSize: 13, background: result[p.id].ok ? "#d4edda" : "#f8d7da", border: `1px solid ${result[p.id].ok ? "#28a745" : "#f5c6cb"}`, color: result[p.id].ok ? "#155724" : "#721c24" }}>
              {result[p.id].ok ? (
                <>
                  <strong>Draft created:</strong> {result[p.id].newsletterName}<br />
                  {result[p.id].totalStories} stories \u00b7 {result[p.id].written} written by Letterman \u00b7 {result[p.id].sections.length} sections<br />
                  <span style={{ fontSize: 12 }}>Newsletter ID: <code>{result[p.id].newsletterId}</code></span><br />
                  <a href={`/admin/approval?id=${result[p.id].newsletterId}`} style={{ color: "#155724", fontWeight: 600 }}>Review &amp; approve \u2192</a>
                  {result[p.id].notes.length > 0 && <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12 }}>{result[p.id].notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
                </>
              ) : (
                <><strong>Build failed:</strong> {result[p.id].error}</>
              )}
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
