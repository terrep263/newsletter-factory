"use client";
import { useState } from "react";

type Resp = { ok: boolean; data?: unknown; error?: string };

async function lmCall(method: string, path: string, body?: unknown): Promise<Resp> {
  const r = await fetch("/api/admin/letterman", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, path, body }),
  });
  return r.json();
}

const inp: React.CSSProperties = { padding: "5px 8px", border: "1px solid #ccc", borderRadius: 6, marginRight: 8, fontSize: 13 };
const btn: React.CSSProperties = { padding: "5px 14px", background: "#0021A5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 };
const box: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 8, padding: "14px 16px", marginBottom: 14 };

export default function BuilderPage() {
  const [out, setOut] = useState("");
  const [lastId, setLastId] = useState("");
  const [name, setName] = useState("");
  const [storageId, setStorageId] = useState("");
  const [sectionNlId, setSectionNlId] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionContent, setSectionContent] = useState("");
  const [refNlId, setRefNlId] = useState("");
  const [refUrls, setRefUrls] = useState("");
  const [genNlId, setGenNlId] = useState("");

  const show = (x: unknown) => setOut(typeof x === "string" ? x : JSON.stringify(x, null, 2));

  async function createShell() {
    if (!name) return show("Name is required");
    const payload: Record<string, string> = { name, type: "NEWSLETTER" };
    if (storageId.trim()) payload.storageId = storageId.trim();
    const r = await lmCall("POST", "/newsletters", payload);
    show(r);
    if (r.ok && r.data) {
      const d = r.data as Record<string, unknown>;
      const id = String(d._id ?? d.id ?? "");
      if (id) { setLastId(id); setSectionNlId(id); setRefNlId(id); setGenNlId(id); }
    }
  }

  async function addSection() {
    const id = sectionNlId.trim();
    if (!id || !sectionTitle) return show("Newsletter ID and title required");
    show(await lmCall("POST", `/newsletters/${id}/sections`, { type: "text", title: sectionTitle, content: sectionContent || sectionTitle }));
  }

  async function addRefLinks() {
    const id = refNlId.trim();
    const urls = refUrls.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!id || !urls.length) return show("Newsletter ID and at least one URL required");
    show(await lmCall("POST", `/newsletters/${id}/reference-links`, { urls }));
  }

  async function generateFromRefs() {
    const id = genNlId.trim();
    if (!id) return show("Newsletter ID required");
    show(await lmCall("POST", `/newsletters/${id}/reference-links/generate-prompt-output`, {}));
  }

  return (
    <main>
      <h2 style={{ color: "#0021A5", marginTop: 0 }}>Builder</h2>
      <p style={{ color: "#555", marginTop: 0 }}>Create newsletter shells and add content. No send or publish from this page. All calls go through the server — token never leaves the server.</p>
      <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 6, padding: "8px 12px", fontSize: 13, marginBottom: 16 }}><strong>Live-send is blocked server-side.</strong> Builder operations only.</div>
      {lastId && (<div style={{ background: "#d4edda", border: "1px solid #28a745", borderRadius: 6, padding: "8px 12px", fontSize: 13, marginBottom: 14 }}>Last created ID: <code>{lastId}</code> — pre-filled below.</div>)}
      <div style={box}>
        <h3 style={{ margin: "0 0 10px" }}>1 · Create newsletter shell</h3>
        <input style={{ ...inp, width: 260 }} placeholder="Newsletter name" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={{ ...inp, width: 180 }} placeholder="Publication ID (optional)" value={storageId} onChange={(e) => setStorageId(e.target.value)} />
        <button style={btn} onClick={createShell}>Create</button>
      </div>
      <div style={box}>
        <h3 style={{ margin: "0 0 10px" }}>2 · Add a section</h3>
        <input style={{ ...inp, width: 240 }} placeholder="Newsletter ID" value={sectionNlId} onChange={(e) => setSectionNlId(e.target.value)} />
        <input style={{ ...inp, width: 200 }} placeholder="Section title" value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} />
        <button style={btn} onClick={addSection}>Add section</button>
        <br />
        <textarea style={{ ...inp, width: "100%", height: 70, marginTop: 8, display: "block" }} placeholder="Section content (optional)" value={sectionContent} onChange={(e) => setSectionContent(e.target.value)} />
      </div>
      <div style={box}>
        <h3 style={{ margin: "0 0 10px" }}>3 · Add reference links</h3>
        <input style={{ ...inp, width: 240 }} placeholder="Newsletter ID" value={refNlId} onChange={(e) => setRefNlId(e.target.value)} />
        <button style={btn} onClick={addRefLinks}>Add links</button>
        <textarea style={{ ...inp, width: "100%", height: 70, marginTop: 8, display: "block" }} placeholder="One URL per line" value={refUrls} onChange={(e) => setRefUrls(e.target.value)} />
      </div>
      <div style={box}>
        <h3 style={{ margin: "0 0 10px" }}>4 · Generate content from reference links</h3>
        <input style={{ ...inp, width: 240 }} placeholder="Newsletter ID" value={genNlId} onChange={(e) => setGenNlId(e.target.value)} />
        <button style={btn} onClick={generateFromRefs}>Generate</button>
      </div>
      <div style={box}>
        <h3 style={{ margin: "0 0 6px" }}>Output</h3>
        <pre style={{ background: "#111", color: "#0f0", padding: 12, borderRadius: 6, overflow: "auto", maxHeight: 320, fontSize: 12 }}>{out || "—"}</pre>
      </div>
    </main>
  );
}
