import { NextRequest, NextResponse } from "next/server";
import { subscribers as lettermanSubscribers } from "@/lib/letterman";
import { subscribe, sendyConfig } from "@/lib/sendy";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const key = req.nextUrl.searchParams.get("key") || "";
  return bearer === secret || key === secret;
}

type LM = { email?: string; firstName?: string; lastName?: string; name?: string; status?: string };

function nameOf(s: LM): string | undefined {
  if (s.name && s.name.trim()) return s.name.trim();
  const fn = [s.firstName, s.lastName].filter(Boolean).join(" ").trim();
  return fn || undefined;
}

/**
 * One-time import: reads existing subscribers from Letterman and pushes them
 * into a Sendy list. The APP does the work (no external scripts).
 *  - ?dry=1   preview: counts Letterman subscribers, no Sendy writes
 *  - default  live import into SENDY_LIST_ID (or ?list=)
 * Guarded by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const listId = req.nextUrl.searchParams.get("list") || process.env.SENDY_LIST_ID || "";

  let source: LM[];
  try {
    source = (await lettermanSubscribers.list()) as unknown as LM[];
  } catch (e) {
    return NextResponse.json({ ok: false, stage: "letterman_read", error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }

  const valid = source.filter((s) => s.email && /.+@.+\..+/.test(s.email));
  const cfg = sendyConfig();

  if (dry) {
    return NextResponse.json({
      ok: true, mode: "dry-run", lettermanCount: source.length, importable: valid.length,
      sample: valid.slice(0, 3).map((s) => ({ email: s.email, name: nameOf(s) })),
      sendyConfigured: cfg.hasApiKey, sendyBase: cfg.base, listId: listId || null,
    });
  }

  if (!cfg.hasApiKey) return NextResponse.json({ ok: false, error: "SENDY_API_KEY not set" }, { status: 400 });
  if (!listId) return NextResponse.json({ ok: false, error: "SENDY_LIST_ID not set (or pass ?list=)" }, { status: 400 });

  let imported = 0, already = 0, failed = 0;
  const errors: { email: string; body: string }[] = [];
  for (const s of valid) {
    try {
      const r = await subscribe(listId, s.email!, nameOf(s));
      if (r.already) already++;
      else if (r.ok) imported++;
      else { failed++; if (errors.length < 20) errors.push({ email: s.email!, body: r.body }); }
    } catch (e) {
      failed++; if (errors.length < 20) errors.push({ email: s.email!, body: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ ok: failed === 0, mode: "live", listId, total: valid.length, imported, already, failed, errors });
}
