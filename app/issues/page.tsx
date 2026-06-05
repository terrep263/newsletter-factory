"use client";
import { useEffect, useState } from "react";

type Issue = {
  id: string; title: string; status: string;
  letterman_newsletter_id: string | null; error: string | null; created_at: string;
};

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const j = await fetch("/api/issues").then((r) => r.json());
    setIssues(j.issues ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function push(id: string) {
    setBusy(id); setMsg("");
    const res = await fetch("/api/issues/push", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue_id: id }),
    });
    const j = await res.json();
    setBusy(null);
    if (!res.ok) { setMsg("Error: " + j.error); return; }
    setMsg(`Pushed to Letterman (${j.sections} sections). Open Letterman to lay out & send.`);
    load();
  }

  const badge = (s: string) => <span className={`tag ${s}`}>{s}</span>;

  return (
    <main>
      <p className="kicker">Publish</p>
      <h2 className="head">Issues</h2>
      <p>Issues assembled from approved inbox items. Push to Letterman to generate the newsletter, then lay out and send there.</p>
      {msg && <p className="meta" style={{ marginTop: ".75rem" }}>{msg}</p>}
      {loading ? <p>Loading…</p> : issues.length === 0 ? (
        <p className="meta" style={{ marginTop: "1rem" }}>No issues yet. Build one from the Content Inbox.</p>
      ) : (
        <table className="data" style={{ marginTop: "1rem" }}>
          <thead><tr><th>Title</th><th>Status</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {issues.map((i) => (
              <tr key={i.id}>
                <td>{i.title}{i.error && <><br /><span className="meta" style={{ color: "var(--press-red)" }}>{i.error}</span></>}</td>
                <td>{badge(i.status)}</td>
                <td>{new Date(i.created_at).toLocaleDateString()}</td>
                <td>
                  {i.status === "draft" && <button onClick={() => push(i.id)} disabled={busy === i.id}>{busy === i.id ? "Pushing…" : "Push to Letterman →"}</button>}
                  {i.letterman_newsletter_id && <a className="meta" href="https://app.letterman.ai" target="_blank" rel="noreferrer">Open in Letterman</a>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
