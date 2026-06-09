"use client";
import { useEffect, useState } from "react";

type Issue = {
  id: string; title: string; status: string;
  error: string | null; created_at: string;
};

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const j = await fetch("/api/issues").then((r) => r.json());
    setIssues(j.issues ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const badge = (st: string) => <span className={`tag ${st}`}>{st}</span>;

  return (
    <main>
      <p className="kicker">Publish</p>
      <h2 className="head">Issues</h2>
      <p>Issues assembled from approved inbox items. Push the current issue to Sendy as a draft from <a href="/desk">The Desk</a>, then review and send from the Sendy dashboard.</p>
      {loading ? <p>Loading…</p> : issues.length === 0 ? (
        <p className="meta" style={{ marginTop: "1rem" }}>No issues yet. Build one from the Content Inbox.</p>
      ) : (
        <table className="data" style={{ marginTop: "1rem" }}>
          <thead><tr><th>Title</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {issues.map((i) => (
              <tr key={i.id}>
                <td>{i.title}{i.error && <><br /><span className="meta" style={{ color: "var(--press-red)" }}>{i.error}</span></>}</td>
                <td>{badge(i.status)}</td>
                <td>{new Date(i.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
