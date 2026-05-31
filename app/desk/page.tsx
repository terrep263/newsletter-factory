import { db } from "@/lib/supabase";
import lm from "@/lib/letterman";
import gc from "@/lib/globalcontrol";

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
  } catch { /* Letterman unreachable / token unset */ }

  // Global Control engagement snapshot
  let gcContacts = "—";
  let gcActive = "—";
  let gcDead = "—";
  try {
    const c = (await gc.contacts.list({ limit: 1 })) as Record<string, unknown>;
    gcContacts = String(c.total ?? "—");
    const open = Number(c.total_active_open ?? 0);
    const click = Number(c.total_active_click ?? 0);
    gcActive = String(open + click);
    gcDead = String(c.total_dead ?? "—");
  } catch { /* Global Control key unset */ }

  return {
    brands: brands.count ?? 0,
    issues: issues.count ?? 0,
    inbox: items.count ?? 0,
    subscribers, newsletters,
    gcContacts, gcActive, gcDead,
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

      <p className="kicker">Audience Engagement · Global Control</p>
      <div className="status-row">
        <span className="pill">Tracked contacts <b>{s.gcContacts}</b></span>
        <span className="pill">Active (open/click) <b>{s.gcActive}</b></span>
        <span className="pill">Dead <b>{s.gcDead}</b></span>
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
          <h3>Publish & Target</h3>
          <p className="meta">Letterman → engaged segments</p>
          <p>Send through Letterman, and use Global Control segments to reach active subscribers and fire follow-up tags.</p>
          <a href="/issues">View issues →</a>
        </div>
      </div>
    </main>
  );
}
