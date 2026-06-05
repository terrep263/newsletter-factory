"use client";
import { useEffect, useState } from "react";

type Source = {
  id: string; name: string; source_type: string; url: string | null;
  county: string | null; active: boolean; last_pulled_at: string | null;
};
type Brand = { id: string; name: string };

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ brand_id: "", name: "", source_type: "rss", url: "", county: "", item_type: "story" });

  async function load() {
    setLoading(true);
    const [s, b] = await Promise.all([
      fetch("/api/sources").then((r) => r.json()),
      fetch("/api/brands").then((r) => r.json()),
    ]);
    setSources(s.sources ?? []);
    setBrands(b.brands ?? []);
    if (b.brands?.[0]) setForm((f) => ({ ...f, brand_id: f.brand_id || b.brands[0].id }));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addSource() {
    setMsg("");
    const res = await fetch("/api/sources", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, config: { item_type: form.item_type } }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg("Error: " + j.error); return; }
    setForm((f) => ({ ...f, name: "", url: "" }));
    load();
  }

  async function runCollector(brand_id: string) {
    setMsg("Collecting…");
    const res = await fetch("/api/collect", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand_id }),
    });
    const j = await res.json();
    if (!res.ok) { setMsg("Error: " + j.error); return; }
    setMsg(`Collected: ${j.totals.inserted} new, ${j.totals.skipped} dupes, ${j.totals.fetched} fetched.`);
    load();
  }

  return (
    <main>
      <p className="kicker">Collect</p>
      <h2 className="head">Sources</h2>
      <p>RSS/Atom feeds that feed the 352 content inbox. Run the collector to pull the latest items.</p>
      <div className="card" style={{ marginTop: "1rem" }}>
        <h3>Add a source</h3>
        <div className="form-grid">
          <select value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input placeholder="Source name (e.g. Lake County Permits)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Feed URL (https://…)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <select value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })}>
            <option value="rss">RSS</option><option value="atom">Atom</option>
          </select>
          <select value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value })}>
            <option value="story">Story</option><option value="event">Event</option>
            <option value="permit">Permit</option><option value="agenda">Agenda</option>
          </select>
          <input placeholder="County (optional)" value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
          <button onClick={addSource} disabled={!form.brand_id || !form.name}>Add source</button>
        </div>
      </div>
      {msg && <p className="meta" style={{ marginTop: ".75rem" }}>{msg}</p>}
      <div className="status-row" style={{ marginTop: "1rem" }}>
        {brands.map((b) => (
          <button key={b.id} className="pill-btn" onClick={() => runCollector(b.id)}>▶ Collect for {b.name}</button>
        ))}
      </div>
      <h3 style={{ marginTop: "1.5rem" }}>Active sources</h3>
      {loading ? <p>Loading…</p> : sources.length === 0 ? <p className="meta">No sources yet. Add one above.</p> : (
        <table className="data">
          <thead><tr><th>Name</th><th>Type</th><th>County</th><th>Last pulled</th></tr></thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td>{s.name}<br /><span className="meta">{s.url}</span></td>
                <td>{s.source_type}</td>
                <td>{s.county ?? "—"}</td>
                <td>{s.last_pulled_at ? new Date(s.last_pulled_at).toLocaleString() : "never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
