"use client";
import { useState, type CSSProperties } from "react";

const NAVY = "#16365d";
const NAVY_DEEP = "#0f2742";
const ORANGE = "#ef7a2b";
const PAPER = "#efe9dd";

const wrap: CSSProperties = { minHeight: "100vh", background: PAPER, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#1d2024" };
const card: CSSProperties = { width: "100%", maxWidth: 540, background: "#fff", border: "1px solid #d9d2c2", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 50px -28px rgba(15,39,66,.4)" };
const head: CSSProperties = { background: NAVY_DEEP, color: "#fff", padding: "24px 28px" };
const logo: CSSProperties = { fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9fb4cb", fontWeight: 700 };
const h1: CSSProperties = { fontSize: 24, fontWeight: 800, margin: "6px 0 0" };
const sub: CSSProperties = { color: "#cdd9e6", fontSize: 14, marginTop: 6 };
const body: CSSProperties = { padding: "24px 28px" };
const label: CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, margin: "16px 0 6px" };
const input: CSSProperties = { width: "100%", padding: "11px 12px", borderRadius: 8, border: "1px solid #d9d2c2", fontSize: 15, fontFamily: "inherit", background: "#fff", color: "#1d2024", boxSizing: "border-box" };
const btn = (busy: boolean): CSSProperties => ({ width: "100%", marginTop: 22, padding: "13px", borderRadius: 8, border: "none", background: busy ? "#f0a875" : ORANGE, color: "#fff", fontSize: 16, fontWeight: 700, cursor: busy ? "default" : "pointer" });
const hidden: CSSProperties = { position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" };

export default function TipPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ headline: "", tip: "", category: "other", town: "", name: "", contact: "", website: "" });
  const upd = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit() {
    if (!f.tip.trim()) { setErr("Please tell us the tip."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/tips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Something went wrong."); }
      setSent(true);
    } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={head}>
          <div style={logo}>The 352 Beat</div>
          <h1 style={h1}>Got a tip?</h1>
          <div style={sub}>New business, an event, a shoutout, good news — tell us what&apos;s happening around Lake County.</div>
        </div>
        <div style={body}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 40 }}>📨</div>
              <h2 style={{ color: NAVY, margin: "10px 0 6px" }}>Thanks — got it!</h2>
              <p style={{ color: "#555", fontSize: 15 }}>Our team will take a look. You might just see it in the next issue.</p>
              <button style={{ ...btn(false), marginTop: 24, background: NAVY }} onClick={() => { setSent(false); setF({ headline: "", tip: "", category: "other", town: "", name: "", contact: "", website: "" }); }}>Send another</button>
            </div>
          ) : (
            <>
              <label style={label}>What&apos;s the tip? <span style={{ color: ORANGE }}>*</span></label>
              <textarea style={{ ...input, minHeight: 110, resize: "vertical" }} value={f.tip} onChange={upd("tip")} placeholder="Tell us what's happening — the more detail, the better." />
              <label style={label}>What&apos;s it about?</label>
              <select style={input} value={f.category} onChange={upd("category")}>
                <option value="event">An event</option>
                <option value="business">A new business / opening or closing</option>
                <option value="good_news">Good news / a shoutout</option>
                <option value="other">Something else</option>
              </select>
              <label style={label}>Short headline (optional)</label>
              <input style={input} value={f.headline} onChange={upd("headline")} placeholder="e.g. New taco spot on Main Street" />
              <label style={label}>Town / area (optional)</label>
              <input style={input} value={f.town} onChange={upd("town")} placeholder="e.g. Leesburg, Mount Dora, The Villages" />
              <label style={label}>Your name (optional)</label>
              <input style={input} value={f.name} onChange={upd("name")} placeholder="So we can credit you" />
              <label style={label}>Email or phone (optional)</label>
              <input style={input} value={f.contact} onChange={upd("contact")} placeholder="In case we need to follow up" />
              <input style={hidden} tabIndex={-1} autoComplete="off" value={f.website} onChange={upd("website")} aria-hidden="true" />
              {err && <div style={{ color: "#c0392b", fontSize: 14, marginTop: 14 }}>{err}</div>}
              <button style={btn(busy)} onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send the tip →"}</button>
              <p style={{ color: "#9aa0a8", fontSize: 12, marginTop: 14, textAlign: "center" }}>The 352 Beat · The Pulse of Lake County Life</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
