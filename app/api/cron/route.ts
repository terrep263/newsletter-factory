import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { collectBrand } from "@/lib/collector";
import { buildAndPublishIssue } from "@/lib/assemble";

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

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const doAssemble = new URL(req.url).searchParams.get("assemble") === "1";
    const collected = await runAll();
    let weekly: unknown[] | null = null;
    if (doAssemble) {
      weekly = [];
      const { data: brands } = await db.from("brands").select("id, name").eq("active", true);
      for (const b of (brands ?? [])) {
        try {
          const res = await buildAndPublishIssue(b.id);
          weekly.push({ brand: b.name, assembled: !!res.newsletterId, ...res });
        } catch (e) {
          weekly.push({ brand: b.name, assembled: false, reason: e instanceof Error ? e.message : String(e) });
        }
      }
    }
    return NextResponse.json({ ran_at: new Date().toISOString(), brands: collected, weekly });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) { return GET(req); }
