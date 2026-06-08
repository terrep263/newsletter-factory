import { NextRequest, NextResponse } from "next/server";
import { newsletterly } from "@/lib/newsletterly";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const key = req.nextUrl.searchParams.get("key") || "";
  return bearer === secret || key === secret;
}

/**
 * The app sends a newsletter through Newsletterly.
 *  - Test send:  ?id=418&test=you@example.com   (single address)
 *  - Live send:  ?id=418&live=1                  (all active subscribers; explicit opt-in)
 * Guarded by CRON_SECRET. The app makes the call — never outside the app.
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = req.nextUrl.searchParams;
  const id = p.get("id");
  const subject = p.get("subject") || "The 352 Beat \u2014 Issue #1";
  const test = p.get("test");
  const live = p.get("live") === "1";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  if (!test && !live) return NextResponse.json({ error: "specify ?test=<email> for a test send, or ?live=1 for a live send" }, { status: 400 });
  try {
    const r = await newsletterly.send(id, subject, test || undefined);
    const ok = r.status === 200 || r.status === 201;
    return NextResponse.json({
      ok, mode: test ? "test" : "live", to: test || "all active subscribers",
      newsletterlyStatus: r.status, response: r.data,
    }, { status: ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
