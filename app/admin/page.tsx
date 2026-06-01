"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

type Resp = { ok: boolean; data?: any; status?: number; error?: string; body?: any };

async function call(method: string, path: string, body?: any): Promise<Resp> {
  const r = await fetch("/api/admin/letterman", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, path, body }),
  });
  return r.json();
}

const box: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 16 };
const btn: React.CSSProperties = { padding: "6px 10px", marginRight: 6, border: "1px solid #0021A5", background: "#0021A5", color: "#fff", borderRadius: 6, cursor: "pointer" };
const btnG: React.CSSProperties = { ...btn, background: "#fff", color: "#0021A5" };
const inp: React.CSSProperties = { padding: 6, border: "1px solid #ccc", borderRadius: 6, marginRight: 6 };

export default function AdminPage() {
  const [pubs, setPubs] = useState<any[]>([]);
  const [storageId, setStorageId] = useState("");
  const [drafts, setDrafts] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [out, setOut] = useState("");
  const [rm, setRm] = useState("GET");
  const [rp, setRp] = useState("/user");
  const [rb, setRb] = useState("");

  const show = (x: any) => setOut(typeof x === "string" ? x : JSON.stringify(x, null, 2));

  async function loadPubs() {
    const r = await call("GET", "/newsletters-storage");
    const list = Array.isArray(r.data) ? r.data : [];
    setPubs(list);
    if (list[0]?._id && !storageId) setStorageId(list[0]._id);
    show(r);
  }
  async function loadDrafts(sid: string) {
    if (!sid) return;
    const r = await call("GET", `/newsletters-storage/${sid}/newsletters?state=DRAFT&start=2020-01-01&end=2100-01-01&type=`);
    setDrafts(Array.isArray(r.data) ? r.data : []);
  }

  useEffect(() => { loadPubs(); }, []);
  useEffect(() => { if (storageId) loadDrafts(storageId); }, [storageId]);

  async function createDraft() {
    if (!name || !storageId) return show({ error: "name + publication required" });
    show(await call("POST", "/newsletters", { name, type: "NEWSLETTER", storageId }));
    setName(""); loadDrafts(storageId);
  }
  async function dup(id: string) { show(await call("GET", `/newsletters/${id}/duplicate`)); loadDrafts(storageId); }
  async function rename(id: string) { const n = prompt("New name?"); if (!n) return; show(await call("PUT", `/newsletters/${id}`, { name: n })); loadDrafts(storageId); }
  async function del(id: string) { if (!confirm("Delete permanently?")) return; show(await call("DELETE", `/newsletters/${id}`)); loadDrafts(storageId); }
  async function sendTest(id: string) { const e = prompt("Send test to which email?"); if (!e) return; show(await call("POST", `/newsletters/send-test-email/${id}`, { email: e })); }

  async function runRaw() {
    let body: any;
    if (rb.trim()) { try { body = JSON.parse(rb); } catch { return show("Body is not valid JSON"); } }
    show(await call(rm, rp, body));
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ color: "#0021A5" }}>Newsletter Factory — Admin Control</h1>
      <p style={{ color: "#666" }}>Full control of Letterman via the app. Token stays server-side.</p>

      <div style={box}>
        <h3>Publication</h3>
        <select style={inp} value={storageId} onChange={(e) => setStorageId(e.target.value)}>
          <option value="">— select —</option>
          {pubs.map((p) => <option key={p._id} value={p._id}>{p.name} ({p._id})</option>)}
        </select>
        <button style={btnG} onClick={loadPubs}>Reload</button>
      </div>

      <div style={box}>
        <h3>Create draft (attached to publication)</h3>
        <input style={inp} placeholder="Draft name" value={name} onChange={(e) => setName(e.target.value)} />
        <button style={btn} onClick={createDraft}>Create</button>
      </div>

      <div style={box}>
        <h3>Drafts ({drafts.length})</h3>
        {drafts.map((d) => (
          <div key={d._id} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
            <strong>{d.name}</strong> <span style={{ color: "#999" }}>{d._id} · {d.wordCount} words</span>
            <div style={{ marginTop: 6 }}>
              <button style={btnG} onClick={() => dup(d._id)}>Duplicate</button>
              <button style={btnG} onClick={() => rename(d._id)}>Rename</button>
              <button style={btnG} onClick={() => sendTest(d._id)}>Send test</button>
              <button style={{ ...btnG, color: "#b00", borderColor: "#b00" }} onClick={() => del(d._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div style={box}>
        <h3>Raw API console</h3>
        <select style={inp} value={rm} onChange={(e) => setRm(e.target.value)}>
          <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
        </select>
        <input style={{ ...inp, width: 380 }} value={rp} onChange={(e) => setRp(e.target.value)} placeholder="/newsletters" />
        <button style={btn} onClick={runRaw}>Send</button>
        <textarea style={{ ...inp, width: "100%", height: 80, marginTop: 8, display: "block" }} value={rb} onChange={(e) => setRb(e.target.value)} placeholder='Optional JSON body, e.g. {"name":"X","type":"NEWSLETTER"}' />
      </div>

      <div style={box}>
        <h3>Output</h3>
        <pre style={{ background: "#111", color: "#0f0", padding: 12, borderRadius: 6, overflow: "auto", maxHeight: 360 }}>{out}</pre>
      </div>
    </main>
  );
}
