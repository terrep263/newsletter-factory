import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { renderIssue } from "@/lib/render-email";
import { createCampaign, sendyConfig } from "@/lib/sendy";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BRAND_352 = "c72c2449-2949-40f7-8b8f-1a1848190b38";

// Founder control surfaced on /desk (Basic Auth gated by the proxy).
// Renders the current issue and creates a DRAFT campaign in Sendy via create.php.
// Targeted to SENDY_LIST_ID when set, else assigned to SENDY_BRAND_ID.
// mode "dry" renders only (no Sendy call). This route never sends a live campaign.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "dry" ? "dry" : "draft";
  try {
    const r = await renderIssue(BRAND_352);

    if (mode === "dry") {
      return NextResponse.json({
        ok: true, mode: "dry-run", title: r.title, htmlBytes: r.html.length,
        topStory: r.topTitle, spotlight: r.spotTitle,
        sendyConfigured: sendyConfig().hasApiKey,
      });
    }

    const cfg = sendyConfig();
    if (!cfg.hasApiKey) return NextResponse.json({ ok: false, error: "SENDY_API_KEY not set on newsletter-factory" }, { status: 400 });
    const brandId = process.env.SENDY_BRAND_ID || "";
    const listIds = process.env.SENDY_LIST_ID || "";
    if (!listIds && !brandId) return NextResponse.json({ ok: false, error: "Set SENDY_LIST_ID (or SENDY_BRAND_ID) to create a draft" }, { status: 400 });

    const fromEmail = process.env.SENDY_FROM_EMAIL || "hello@the352beat.com";
    const created = await createCampaign({
      title: r.title,
      subject: r.title,
      html: r.html,
      fromName: process.env.SENDY_FROM_NAME || "The 352 Beat",
      fromEmail,
      replyTo: process.env.SENDY_REPLY_TO || fromEmail,
      brandId: listIds ? undefined : brandId,
      listIds: listIds || undefined,
      send: false,
    });

    if (created.ok) {
      await db.from("issues").insert({
        brand_id: BRAND_352, title: r.title, status: "draft",
        lead_zone: r.leadZone, featured_zones: r.zonesFeatured,
      });
    }

    return NextResponse.json({
      ok: created.ok, mode: "draft", sendyStatus: created.status, response: created.body,
      htmlBytes: r.html.length, topStory: r.topTitle, spotlight: r.spotTitle,
    }, { status: created.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
