"use client";
import { useEffect, useState } from "react";

type ApprovalRecord = {
  newsletterId: string; newsletterTitle?: string; subject?: string;
  previewCompletedAt?: string; previewAvailable: boolean;
  testSendCompletedAt?: string; testSendRecipient?: string;
  scheduleDateTime?: string; audienceSummary?: string;
  approvalStatus: string; approvedAt?: string; rejectedAt?: string;
  rejectionReason?: string; createdAt: string; updatedAt: string;
};

const CONFIRM_PHRASE = "APPROVE SCHEDULED NEWSLETTER SEND";

const s = {
  box: { border: "1px solid #ddd", borderRadius: 8, padding: "14px 18px", marginBottom: 14 } as React.CSSProperties,
  inp: { width: "100%", padding: "6px 8px", border: "1px solid #ccc", borderRadius: 6, fontSize: 13, boxSizing: "border-box" as const, marginBottom: 10 },
  btnGo: { padding: "7px 20px", background: "#155724", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, marginRight: 10 } as React.CSSProperties,
  btnNo: { padding: "7px 20px", background: "#721c24", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 } as React.CSSProperties,
};

function statusColor(st: string) {
  if (st === "approved") return "#155724";
  if (st === "rejected" || st === "blocked") return "#721c24";
  if (st === "stale") return "#856404";
  return "#004085";
}

function Gate({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 4 }}>
      <span style={{ fontWeight: 700, color: ok ? "#155724" : "#721c24" }}>{ok ? "✓" : "✗"}</span>
      {label}
    </div>
  );
}

export default function ApprovalPage() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [selected, setSelected] = useState<ApprovalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [nogoReason, setNogoReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/approval").then((res) => res.json());
    setApprovals(r.approvals ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    const qid = params.get("id");
    if (qid) {
      fetch("/api/admin/approval").then((res) => res.json()).then((r) => {
        const found = (r.approvals ?? []).find((a: ApprovalRecord) => a.newsletterId === qid);
        if (found) setSelected(found);
      });
    }
  }, []);

  async function initAndSelect(id: string) {
    await fetch("/api/admin/approval", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "init", newsletterId: id }),
    });
    const r = await fetch("/api/admin/approval").then((res) => res.json());
    const found = (r.approvals ?? []).find((a: ApprovalRecord) => a.newsletterId === id);
    setApprovals(r.approvals ?? []);
    if (found) setSelected(found);
  }

  async function doGo() {
    if (!selected) return;
    setBusy(true); setResult(null);
    const r = await fetch("/api/admin/approval", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "go", newsletterId: selected.newsletterId, password, confirmPhrase: phrase }),
    }).then((res) => res.json());
    setBusy(false);
    setResult({ ok: r.ok, message: r.ok ? (r.message ?? "GO approved.") : (r.error ?? "GO rejected.") });
    if (r.ok) { setPassword(""); setPhrase(""); load(); }
  }

  async function doNogo() {
    if (!selected) return;
    setBusy(true); setResult(null);
    const r = await fetch("/api/admin/approval", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "nogo", newsletterId: selected.newsletterId, reason: nogoReason }),
    }).then((res) => res.json());
    setBusy(false);
    setResult({ ok: r.ok, message: r.ok ? "NO GO recorded." : (r.error ?? "Failed.") });
    if (r.ok) { setNogoReason(""); load(); }
  }

  async function doNotify() {
    if (!selected) return;
    const r = await fetch("/api/admin/approval", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "notify", newsletterId: selected.newsletterId }),
    }).then((res) => res.json());
    setResult({ ok: r.ok, message: r.ok ? "Approval notice prepared and logged (no email provider wired)." : (r.error ?? "Failed.") });
  }

  const sel = selected;

  return (
    <main>
      <h2 style={{ color: "#0021A5", marginTop: 0 }}>Approval — GO / NO GO</h2>
      <p style={{ color: "#555", marginTop: 0 }}>GO requires: preview completed · test-send completed · approval password · exact confirmation phrase · <code>ENABLE_LIVE_BROADCAST=true</code> for real sends. All gates are enforced server-side.</p>
      {loading && <p>Loading…</p>}
      {!loading && approvals.length === 0 && (<p style={{ color: "#666" }}>No tracked newsletters. Use the <a href="/admin/builder">Builder</a> or push an issue to create one, then use <em>action=init</em> to register it here.</p>)}
      {approvals.length > 0 && !sel && (
        <div>
          <h4>Tracked newsletters</h4>
          {approvals.map((a) => (
            <div key={a.newsletterId} style={{ ...s.box, cursor: "pointer" }} onClick={() => setSelected(a)}>
              <strong>{a.newsletterTitle ?? a.newsletterId}</strong>{" "}
              <span style={{ padding: "1px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: "#eee", color: statusColor(a.approvalStatus) }}>{a.approvalStatus}</span>
              <span style={{ fontSize: 12, color: "#888", marginLeft: 10 }}>Updated {new Date(a.updatedAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      {sel && (
        <div>
          <button onClick={() => { setSelected(null); setResult(null); }} style={{ marginBottom: 12, fontSize: 13, cursor: "pointer" }}>← Back to list</button>
          <div style={s.box}>
            <h3 style={{ margin: "0 0 6px" }}>{sel.newsletterTitle ?? sel.newsletterId}</h3>
            {sel.subject && <p style={{ margin: "0 0 6px", fontSize: 13 }}>Subject: <strong>{sel.subject}</strong></p>}
            <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700, color: statusColor(sel.approvalStatus), background: "#f0f0f0" }}>{sel.approvalStatus.toUpperCase()}</span>
          </div>
          <div style={s.box}>
            <h4 style={{ margin: "0 0 10px" }}>Approval checklist</h4>
            <Gate ok={!!sel.previewCompletedAt} label={sel.previewCompletedAt ? `Preview completed ${new Date(sel.previewCompletedAt).toLocaleString()}` : "Preview not yet completed — visit Preview page"} />
            <Gate ok={!!sel.testSendCompletedAt} label={sel.testSendCompletedAt ? `Test email sent to ${sel.testSendRecipient} at ${new Date(sel.testSendCompletedAt).toLocaleString()}` : "Test email not yet sent — visit Test Send page"} />
            <Gate ok={sel.approvalStatus !== "stale"} label={sel.approvalStatus === "stale" ? "Approval is STALE — re-complete preview and test-send" : "Approval not stale"} />
            {sel.scheduleDateTime && (<Gate ok={new Date(sel.scheduleDateTime) > new Date()} label={`Schedule: ${new Date(sel.scheduleDateTime).toLocaleString()}`} />)}
            {sel.audienceSummary && <p style={{ fontSize: 13, margin: "6px 0 0", color: "#555" }}>Audience: {sel.audienceSummary}</p>}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href={`/admin/preview?id=${sel.newsletterId}`} style={{ fontSize: 13 }}>Preview →</a>
            <a href={`/admin/test-send?id=${sel.newsletterId}`} style={{ fontSize: 13 }}>Test Send →</a>
            <button onClick={doNotify} style={{ fontSize: 12, cursor: "pointer", border: "1px solid #ccc", borderRadius: 6, padding: "3px 10px", background: "#fff" }}>Prepare approval notice</button>
          </div>
          <div style={{ ...s.box, marginTop: 16, border: "2px solid #155724" }}>
            <h4 style={{ margin: "0 0 10px", color: "#155724" }}>GO — Approve for publishing</h4>
            <p style={{ fontSize: 12, color: "#555", margin: "0 0 10px" }}>Server validates all gates before acting. With <code>ENABLE_LIVE_BROADCAST=false</code> (default), approval is recorded but no broadcast fires.</p>
            <input type="password" style={s.inp} placeholder="Approval password (PUBLISH_APPROVAL_PASSWORD)" value={password} onChange={(e) => setPassword(e.target.value)} />
            <input style={s.inp} placeholder={`Type exactly: ${CONFIRM_PHRASE}`} value={phrase} onChange={(e) => setPhrase(e.target.value)} />
            <button style={s.btnGo} onClick={doGo} disabled={busy}>{busy ? "Checking gates…" : "GO — Submit for approval"}</button>
          </div>
          <div style={{ ...s.box, border: "2px solid #721c24" }}>
            <h4 style={{ margin: "0 0 10px", color: "#721c24" }}>NO GO — Block publishing</h4>
            <textarea style={{ ...s.inp, height: 60 }} placeholder="Reason (optional)" value={nogoReason} onChange={(e) => setNogoReason(e.target.value)} />
            <button style={s.btnNo} onClick={doNogo} disabled={busy}>{busy ? "Recording…" : "NO GO — Block this newsletter"}</button>
          </div>
          {result && (<div style={{ padding: "10px 14px", borderRadius: 6, border: `1px solid ${result.ok ? "#28a745" : "#f5c6cb"}`, background: result.ok ? "#d4edda" : "#f8d7da", fontSize: 13, color: result.ok ? "#155724" : "#721c24" }}>{result.message}</div>)}
        </div>
      )}
      {!sel && (
        <div style={{ ...s.box, marginTop: 16 }}>
          <h4 style={{ margin: "0 0 8px" }}>Register a newsletter for approval tracking</h4>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const nlId = String(fd.get("nlId") ?? "").trim(); if (nlId) initAndSelect(nlId); }} style={{ display: "flex", gap: 8 }}>
            <input name="nlId" style={{ padding: "5px 8px", border: "1px solid #ccc", borderRadius: 6, flex: 1, fontSize: 13 }} placeholder="Letterman newsletter ID" />
            <button type="submit" style={{ padding: "5px 14px", background: "#0021A5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Register</button>
          </form>
        </div>
      )}
    </main>
  );
}
