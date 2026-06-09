import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { renderIssue } from "@/lib/render-email";
import { createCampaign, sendyConfig } from "@/lib/sendy";

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
 * The app renders the branded HTML issue and creates it as a CAMPAIGN in Sendy
 * via Sendy's create.php. The app does the work; this endpoint is the trigger.
 *  - ?dry=1   render only, no Sendy call (verifiable without Sendy creds)
 *  - default  create a DRAFT campaign in Sendy (send_campaign=0).
 *             Targeted to SENDY_LIST_ID when set, else assigned to SENDY_BRAND_ID.
 *  - ?send=1  live send to SENDY_LIST_ID (needs verified domain) — explicit only
 * Guarded by CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = req.nextUrl.searchParams;
  const dry = p.get("dry") === "1";
  const send = p.get("send") === "1";

  try {
    const r = await renderIssue(BRAND_352);

    if (dry) {
      return NextResponse.json({
        ok: true, mode: "dry-run", title: r.title, htmlBytes: r.html.length,
        topStory: r.topTitle, spotlight: r.spotTitle, leadZone: r.leadZone,
        zonesFeatured: r.zonesFeatured, sendyConfigured: sendyConfig().hasApiKey,
      });
    }

    const cfg = sendyConfig();
    if (!cfg.hasApiKey) return NextResponse.json({ ok: false, error: "SENDY_API_KEY not set on newsletter-factory" }, { status: 400 });

    const brandId = process.env.SENDY_BRAND_ID || "";
    const listIds = process.env.SENDY_LIST_ID || "";
    const fromName = process.env.SENDY_FROM_NAME || "The 352 Beat";
    const fromEmail = process.env.SENDY_FROM_EMAIL || "hello@the352beat.com";
    const replyTo = process.env.SENDY_REPLY_TO || fromEmail;
    const subject = p.get("subject") || r.title;

    if (send && !listIds) return NextResponse.json({ ok: false, error: "send requires SENDY_LIST_ID" }, { status: 400 });
    if (!send && !listIds && !brandId) return NextResponse.json({ ok: false, error: "draft requires SENDY_LIST_ID or SENDY_BRAND_ID" }, { status: 400 });

    const created = await createCampaign({
      title: r.title, subject, html: r.html, fromName, fromEmail, replyTo,
      brandId: listIds ? undefined : brandId,
      listIds: listIds || undefined,
      send,
    });

    if (created.ok && !send) {
      await db.from("issues").insert({
        brand_id: BRAND_352, title: r.title, status: "draft",
        lead_zone: r.leadZone, featured_zones: r.zonesFeatured,
      });
    }

    return NextResponse.json({
      ok: created.ok, platform: "sendy", mode: send ? "send" : "draft",
      sendyStatus: created.status, response: created.body,
      topStory: r.topTitle, spotlight: r.spotTitle, leadZone: r.leadZone, htmlBytes: r.html.length,
    }, { status: created.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
