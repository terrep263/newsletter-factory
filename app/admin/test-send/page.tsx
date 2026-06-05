"use client";
import { useEffect, useState } from "react";

export default function TestSendPage() {
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qid = params.get("id");
    if (qid) setId(qid);
  }, []);

  async function send() {
    if (!id.trim() || !email.trim()) { setMsg("Newsletter ID and recipient email are required."); return; }
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/test-send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newsletterId: id.trim(), email: email.trim() }),
    }).then((res) => res.json());
    setBusy(false);
    setOk(r.ok);
    setMsg(r.ok ? r.message : ("Error: " + (r.error ?? "Unknown error")));
  }

  return (
    <main>
      <h2 style={{ color: "#0021A5", marginTop: 0 }}>Test Send</h2>
      <p style={{ color: "#555", marginTop: 0 }}>Sends a test email to one address using <code>/newsletters/send-test-email/&#123;id&#125;</code> only. This is never a live broadcast.</p>
      <div style={{ background: "#d4edda", border: "1px solid #28a745", borderRadius: 6, padding: "8px 12px", fontSize: 13, marginBottom: 16 }}>
        <strong>Safe test-send only.</strong> Live broadcast endpoint <code>/newsletters/send-email/*</code> is blocked server-side and cannot be called from this page.
      </div>
      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: "16px 18px", maxWidth: 480 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Letterman Newsletter ID</label>
          <input style={{ width: "100%", padding: "6px 8px", border: "1px solid #ccc", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. 64a1b2c3d4e5f6..." />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Test recipient email</label>
          <input type="email" style={{ width: "100%", padding: "6px 8px", border: "1px solid #ccc", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <button onClick={send} disabled={busy} style={{ padding: "7px 18px", background: busy ? "#999" : "#0021A5", color: "#fff", border: "none", borderRadius: 6, cursor: busy ? "not-allowed" : "pointer" }}>{busy ? "Sending…" : "Send test email"}</button>
      </div>
      {msg && (
        <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 6, border: `1px solid ${ok ? "#28a745" : "#f5c6cb"}`, background: ok ? "#d4edda" : "#f8d7da", fontSize: 13, color: ok ? "#155724" : "#721c24" }}>
          {msg}{ok && (<span> — <a href={`/admin/approval?id=${id}`} style={{ color: "#155724" }}>Go to Approval →</a></span>)}
        </div>
      )}
    </main>
  );
}
