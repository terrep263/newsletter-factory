import { db } from "@/lib/supabase";
import lm from "@/lib/letterman";

export const dynamic = "force-dynamic"; // always live

async function getStats() {
  const [brands, issues, items] = await Promise.all([
    db.from("brands").select("id", { count: "exact", head: true }),
    db.from("issues").select("id", { count: "exact", head: true }),
    db.from("content_items").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  let subscribers = "—";
  let newsletters = "—";
  try {
    const subs = (await lm.subscribers.list()) as unknown[];
    subscribers = String(subs.length);
    const nls = (await lm.newsletters.list()) as unknown[];
    newsletters = String(nls.length);
  } catch { /* Letterman unreachable / token unset — leave dashes */ }

  return {
    brands: brands.count ?? 0,
    issues: issues.count ?? 0,
    inbox: items.count ?? 0,
    subscribers,
    newsletters,
  };
}

export default async function Desk() {
  const s = await getStats();
  return (
    <main>
      <p className="kicker">Newsroom Status</p>
      <h2 className="head">The Desk</h2>

      <div className="status-row">
        <span className="pill">Brands <b>{s.brands}</b></span>
        <span className="pill">Issues <b>{s.issues}</b></span>
        <span className="pill">Inbox (unreviewed) <b>{s.inbox}</b></span>
        <span className="pill">Letterman newsletters <b>{s.newsletters}</b></span>
        <span className="pill">Subscribers <b>{s.subscribers}</b></span>
      </div>

      <div className="grid">
        <div className="card">
          <span className="tag live">Live</span>
          <h3>Collect</h3>
          <p className="meta">352 sources → content inbox</p>
          <p>Permits, government agendas, and events get pulled, deduped, and queued for your review.</p>
          <a href="/sources">Manage sources →</a>
        </div>
        <div className="card">
          <h3>Assemble</h3>
          <p className="meta">Inbox → issue</p>
          <p>Approve items, drop them into an issue, and push to Letterman for layout and send.</p>
          <a href="/issues">Build an issue →</a>
        </div>
        <div className="card">
          <h3>Publish</h3>
          <p className="meta">Letterman → subscribers</p>
          <p>Schedule or send through your existing Letterman account and audience.</p>
          <a href="/issues">View issues →</a>
        </div>
      </div>
    </main>
  );
}
