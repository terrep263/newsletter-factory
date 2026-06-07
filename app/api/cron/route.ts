import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { collectBrand } from "@/lib/collector";
import { assembleIssue } from "@/lib/assemble";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function authorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const key = new URL(req.url).searchParams.get("key") || "";
  return bearer === secret || key === secret;
}

async function runAll() {
  const { data: brands, error } = await db.from("brands").select("id, name").eq("active", true);
  if (error) throw new Error(error.message);
  const out: Array<{ brand: string; inserted: number; skipped: number; fetched: number; errors: string[] }> = [];
  for (const b of (brands ?? [])) {
    const results = await collectBrand(b.id);
    out.push({
      brand: b.name,
      inserted: results.reduce((a, r) => a + r.inserted, 0),
      skipped: results.reduce((a, r) => a + r.skipped, 0),
      fetched: results.reduce((a, r) => a + r.fetched, 0),
      errors: results.filter((r) => r.error).map((r) => `${r.source_name}: ${r.error}`),
    });
  }
  return out;
}

// Weekly orchestration: select fresh items, create an issue, assemble a Letterman
// draft, and log it for approval. Never sends — the publish gate stays closed.
async function buildWeekly(brandId: string, brandName: string) {
  const { data: items, error } = await db
    .from("content_items")
    .select("id, item_type, created_at")
    .eq("brand_id", brandId).eq("status", "new")
    .order("created_at", { ascending: false }).limit(80);
  if (error) return { brand: brandName, assembled: false, reason: error.message };

  const all = items ?? [];
  const ofType = (t: string, n: number) =>
    all.filter((i: { item_type: string | null }) => (i.item_type ?? "story") === t).slice(0, n);
  const chosen = [...ofType("story", 6), ...ofType("event", 4), ...ofType("permit", 3)];
  if (!chosen.length) return { brand: brandName, assembled: false, reason: "no new items" };

  const title = `The 352 Beat — ${new Date().toISOString().slice(0, 10)}`;
  const { data: issue, error: ce } = await db
    .from("issues").insert({ brand_id: brandId, title, status: "draft" }).select("id").single();
  if (ce || !issue) return { brand: brandName, assembled: false, reason: ce?.message ?? "issue insert failed" };

  const rows = chosen.map((c: { id: string }, i: number) => ({ issue_id: issue.id, content_item_id: c.id, position: i }));
  const { error: lie } = await db.from("issue_items").insert(rows);
  if (lie) return { brand: brandName, assembled: false, reason: lie.message };

  try {
    const res = await assembleIssue(issue.id);
    try {
      const { upsertApproval } = await import("@/lib/approval");
      upsertApproval(res.letterman_newsletter_id, {
        newsletterTitle: title, previewAvailable: false, approvalStatus: "pending",
      });
    } catch { /* approval log is best-effort */ }
    return { brand: brandName, assembled: true, issue_id: issue.id, ...res };
  } catch (e) {
    return { brand: brandName, assembled: false, issue_id: issue.id, reason: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const doAssemble = new URL(req.url).searchParams.get("assemble") === "1";
    const collected = await runAll();
    let weekly: unknown[] | null = null;
    if (doAssemble) {
      weekly = [];
      const { data: brands } = await db.from("brands").select("id, name").eq("active", true);
      for (const b of (brands ?? [])) weekly.push(await buildWeekly(b.id, b.name));
    }
    return NextResponse.json({ ran_at: new Date().toISOString(), brands: collected, weekly });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return GET(req); }
