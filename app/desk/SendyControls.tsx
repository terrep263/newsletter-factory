"use client";
import { useState } from "react";

export default function SendyControls() {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function run(mode: "dry" | "draft") {
    setBusy(mode); setMsg("");
    try {
      const res = await fetch("/api/desk/sendy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const j = await res.json();
      if (mode === "dry") {
        setMsg(j.ok
          ? `Dry-run OK \u2014 ${j.htmlBytes} bytes rendered. Top: ${j.topStory || "\u2014"} \u00b7 Spotlight: ${j.spotlight || "\u2014"} \u00b7 Sendy key: ${j.sendyConfigured ? "set" : "missing"}.`
          : `Error: ${j.error || res.status}`);
      } else {
        setMsg(j.ok
          ? `Draft created in Sendy (HTTP ${j.sendyStatus}). Open Sendy \u2192 the352beat \u2192 Drafts to review and send.`
          : `Error: ${j.error || j.response || res.status}`);
      }
    } catch (e) {
      setMsg("Error: " + (e instanceof Error ? e.message : String(e)));
    }
    setBusy(null);
  }

  return (
    <div style={{ marginTop: ".5rem" }}>
      <button onClick={() => run("dry")} disabled={!!busy}>{busy === "dry" ? "Rendering\u2026" : "Dry-run (render only)"}</button>
      {" "}
      <button onClick={() => run("draft")} disabled={!!busy}>{busy === "draft" ? "Pushing\u2026" : "Push Issue #1 to Sendy (draft)"}</button>
      {msg && <p className="meta" style={{ marginTop: ".5rem" }}>{msg}</p>}
    </div>
  );
}
