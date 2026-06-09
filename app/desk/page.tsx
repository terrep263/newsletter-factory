import { db } from "@/lib/supabase";
import gc from "@/lib/globalcontrol";
import SendyControls from "./SendyControls";

export const dynamic = "force-dynamic";

async function getStats() {
  const [brands, issues, items] = await Promise.all([
    db.from("brands").select("id", { count: "exact", head: true }),
    db.from("issues").select("id", { count: "exact", head: true }),
    db.from("content_items").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  let gcContacts = "\u2014";
  let gcActive = "\u2014";
  let gcDead = "\u2014";
  try {
    const c = (await gc.contacts.list({ limit: 1 })) as Record<string, unknown>;
    gcContacts = String(c.total ?? "\u2014");
    const open = Number(c.total_active_open ?? 0);
    const click = Number(c.total_active_click ?? 0);
    gcActive = String(open + click);
    gcDead = String(c.total_dead ?? "\u2014");
  } catch { /* Global Control key unset */ }

  return {
    brands: brands.count ?? 0,
    issues: issues.count ?? 0,
    inbox: items.count ?? 0,
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
      </div>
      <p className="kicker">Audience Engagement · Global Control</p>
      <div className="status-row">
        <span className="pill">Tracked contacts <b>{s.gcContacts}</b></span>
        <span className="pill">Active (open/click) <b>{s.gcActive}</b></span>
        <span className="pill">Dead <b>{s.gcDead}</b></span>
      </div>
      <div className="grid">
        <div className="card"><span className="tag live">Live</span><h3>Collect</h3><p className="meta">352 sources → content inbox</p><p>Permits, government agendas, and events get pulled, deduped, and queued for your review.</p><a href="/sources">Manage sources →</a></div>
        <div className="card"><h3>Assemble</h3><p className="meta">Inbox → issue</p><p>Approve items and drop them into the issue. The renderer builds the full branded HTML email.</p><a href="/issues">View issues →</a></div>
        <div className="card"><span className="tag live">Sendy</span><h3>Publish</h3><p className="meta">Issue → Sendy draft</p><p>Render the current issue and push it to Sendy as a draft campaign for the352beat. Review and send from the Sendy dashboard.</p><SendyControls /></div>
      </div>
    </main>
  );
}
