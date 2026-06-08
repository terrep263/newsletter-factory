import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { renderIssue } from "@/lib/render-email";
import { newsletterly } from "@/lib/newsletterly";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BRAND_352 = "c72c2449-2949-40f7-8b8f-1a1848190b38";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const key = req.nextUrl.searchParams.get("key") || "";
  return bearer === secret || key === secret;
}

/**
 * The app renders the PDF-style HTML issue and creates it as a draft in
 * Newsletterly via Newsletterly's API. The app does all the work; this endpoint
 * is the proof. Guarded by CRON_SECRET. No send happens here — draft only.
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const r = await renderIssue(BRAND_352);
    const created = await newsletterly.createNewsletter(r.title, r.html);
    const ok = created.status === 200 || created.status === 201;
    const id = (created.data as any)?.data?.id ?? null;
    if (ok) {
      await db.from("issues").insert({
        brand_id: BRAND_352, title: r.title, status: "draft",
        lead_zone: r.leadZone, featured_zones: r.zonesFeatured,
      });
    }
    return NextResponse.json({
      ok, platform: "newsletterly", newsletterlyStatus: created.status, newsletterId: id,
      leadZone: r.leadZone, topStory: r.topTitle, spotlight: r.spotTitle, zonesFeatured: r.zonesFeatured,
      htmlBytes: r.html.length, response: created.data,
    }, { status: ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
