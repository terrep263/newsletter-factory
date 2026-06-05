"use client";
import { useEffect, useState } from "react";

type Item = {
  id: string; title: string; body: string | null; url: string | null;
  item_type: string; status: string; event_date: string | null; created_at: string;
};

export default function InboxPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("new");
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const j = await fetch(`/api/inbox?status=${status}`).then((r) => r.json());
    setItems(j.items ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  async function setItemStatus(id: string, newStatus: string) {
    await fetch("/api/inbox", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    load();
  }

  async function buildIssue() {
    const ids = Object.keys(sel).filter((k) => sel[k]);
    if (!ids.length) { setMsg("Select at least one item."); return; }
    const brandRes = await fetch("/api/brands").then((r) => r.json());
    const brand_id = brandRes.brands?.[0]?.id;
    const title = `The 352 Beat — ${new Date().toLocaleDateString()}`;
    const res = await fetch("/api/issues", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand_id, title, item_ids: ids }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg("Error: " + j.error); return; }
    setMsg(`Issue created with ${ids.length} items. Go to Issues to push it to Letterman.`);
    setSel({});
    load();
  }

  const selectedCount = Object.values(sel).filter(Boolean).length;

  return (
    <main>
      <p className="kicker">Assemble</p>
      <h2 className="head">Content Inbox</h2>
      <div className="status-row">
        {["new", "approved", "rejected", "used", "all"].map((s) => (
          <button key={s} className={`pill-btn ${status === s ? "on" : ""}`} onClick={() => setStatus(s)}>{s}</button>
        ))}
      </div>
      {selectedCount > 0 && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <b>{selectedCount} selected</b>
          <button onClick={buildIssue} style={{ marginLeft: ".75rem" }}>Build issue from selection →</button>
        </div>
      )}
      {msg && <p className="meta" style={{ marginTop: ".75rem" }}>{msg}</p>}
      {loading ? <p>Loading…</p> : items.length === 0 ? (
        <p className="meta">No {status} items. Run the collector on the Sources page.</p>
      ) : (
        <div style={{ marginTop: "1rem" }}>
          {items.map((it) => (
            <div key={it.id} className="inbox-item">
              <input type="checkbox" checked={!!sel[it.id]} onChange={(e) => setSel({ ...sel, [it.id]: e.target.checked })} />
              <div style={{ flex: 1 }}>
                <span className="tag">{it.item_type}</span>
                <strong> {it.title}</strong>
                {it.body && <p className="meta">{it.body.slice(0, 220)}{it.body.length > 220 ? "…" : ""}</p>}
                {it.url && <a className="meta" href={it.url} target="_blank" rel="noreferrer">{it.url}</a>}
              </div>
              <div className="actions">
                {it.status !== "approved" && <button onClick={() => setItemStatus(it.id, "approved")}>Approve</button>}
                {it.status !== "rejected" && <button className="ghost" onClick={() => setItemStatus(it.id, "rejected")}>Reject</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
