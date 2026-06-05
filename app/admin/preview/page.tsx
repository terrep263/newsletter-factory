"use client";
import { useEffect, useState } from "react";

type Section = { _id?: string; id?: string; title?: string; type?: string; content?: string; [k: string]: unknown };
type Newsletter = { name?: string; status?: string; wordCount?: number; _id?: string; [k: string]: unknown };

export default function PreviewPage() {
  const [id, setId] = useState("");
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [marked, setMarked] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qid = params.get("id");
    if (qid) { setId(qid); fetchPreview(qid); }
  }, []);

  async function fetchPreview(nlId: string) {
    setLoading(true); setError(""); setMarked(false); setMsg("");
    const r = await fetch(`/api/admin/preview?id=${encodeURIComponent(nlId)}`).then((res) => res.json());
    if (!r.ok) { setError(r.error ?? "Failed"); setLoading(false); return; }
    setNewsletter(r.newsletter);
    setSections(r.sections ?? []);
    setLoading(false);
  }

  async function markCompleted() {
    const r = await fetch("/api/admin/preview", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newsletterId: id }),
    }).then((res) => res.json());
    if (r.ok) { setMarked(true); setMsg("Preview marked as completed. Approval record updated."); }
    else setMsg("Error: " + r.error);
  }

  return (
    <main>
      <h2 style={{ color: "#0021A5", marginTop: 0 }}>Preview</h2>
      <p style={{ color: "#555", marginTop: 0 }}>Retrieve newsletter content and sections from Letterman. No send or publish. Mark preview completed to unlock the GO approval gate.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input style={{ padding: "5px 8px", border: "1px solid #ccc", borderRadius: 6, width: 280, fontSize: 13 }} placeholder="Letterman newsletter ID" value={id} onChange={(e) => setId(e.target.value)} />
        <button onClick={() => { if (id.trim()) fetchPreview(id.trim()); }} style={{ padding: "5px 14px", background: "#0021A5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Load preview</button>
      </div>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "#b00" }}>Error: {error}</p>}
      {msg && <p style={{ color: marked ? "#155724" : "#b00" }}>{msg}</p>}
      {newsletter && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 8px" }}>{String(newsletter.name ?? "Untitled")}</h3>
          <p style={{ margin: 0, fontSize: 13, color: "#555" }}>Status: <strong>{String(newsletter.status ?? "—")}</strong>{" · "}Words: <strong>{newsletter.wordCount != null ? newsletter.wordCount : "—"}</strong></p>
        </div>
      )}
      {sections.length > 0 && (
        <div>
          <h4>Sections ({sections.length})</h4>
          {sections.map((sec, i) => {
            const secId = String(sec._id ?? sec.id ?? i);
            return (
              <div key={secId} style={{ border: "1px solid #eee", borderRadius: 6, padding: "10px 14px", marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>{String(sec.title ?? `Section ${i + 1}`)}</strong>
                <span style={{ fontSize: 11, color: "#999", marginLeft: 8 }}>[{String(sec.type ?? "text")}]</span>
                {sec.content && (<p style={{ margin: "6px 0 0", fontSize: 13, color: "#444", whiteSpace: "pre-wrap" }}>{String(sec.content).slice(0, 400)}{String(sec.content).length > 400 ? "…" : ""}</p>)}
              </div>
            );
          })}
        </div>
      )}
      {newsletter && !marked && (<button onClick={markCompleted} style={{ marginTop: 16, padding: "7px 18px", background: "#155724", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>✓ Mark preview completed (required before GO approval)</button>)}
      {marked && (<p style={{ color: "#155724", fontWeight: 600, marginTop: 12 }}>Preview completed. <a href={`/admin/approval?id=${id}`}>Go to Approval →</a></p>)}
    </main>
  );
}
