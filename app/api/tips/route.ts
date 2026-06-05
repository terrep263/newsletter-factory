import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const BRAND_ID = "c72c2449-2949-40f7-8b8f-1a1848190b38";

const ALLOWED_ORIGINS = new Set([
  "https://the352beat.com",
  "https://www.the352beat.com",
]);
function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://the352beat.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

const TYPE_MAP: Record<string, string> = {
  event: "event",
  business: "business",
  good_news: "story",
  other: "story",
};

async function readerTipsSourceId(): Promise<string | null> {
  const found = await db
    .from("content_sources").select("id")
    .eq("brand_id", BRAND_ID).eq("name", "Reader Tips").limit(1).maybeSingle();
  if (found.data?.id) return found.data.id;
  const created = await db
    .from("content_sources")
    .insert({ brand_id: BRAND_ID, name: "Reader Tips", source_type: "manual", active: false })
    .select("id").single();
  return created.data?.id ?? null;
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req.headers.get("origin"));
  const b = await req.json().catch(() => null);

  const tip = (b?.tip || "").toString().trim();
  if (!tip) {
    return NextResponse.json({ error: "Please tell us the tip." }, { status: 400, headers: cors });
  }
  if ((b?.website || "").toString().trim()) {
    return NextResponse.json({ ok: true }, { status: 200, headers: cors });
  }

  const headline = (b?.headline || "").toString().trim() || tip.slice(0, 80);
  const category = (b?.category || "other").toString();
  const item_type = TYPE_MAP[category] || "story";
  const location = (b?.town || "").toString().trim() || null;
  const name = (b?.name || "").toString().trim() || null;
  const contact = (b?.contact || "").toString().trim() || null;

  try {
    const source_id = await readerTipsSourceId();
    const dedupe_hash = crypto
      .createHash("sha256")
      .update(`${BRAND_ID}|tip|${headline.toLowerCase()}|${contact || ""}|${Date.now()}`)
      .digest("hex");

    const ins = await db.from("content_items").insert({
      brand_id: BRAND_ID,
      source_id,
      item_type,
      title: headline,
      body: tip,
      url: null,
      event_date: null,
      location,
      raw: {
        reader_tip: true,
        category,
        submitted_by: name,
        contact,
        submitted_at: new Date().toISOString(),
      },
      status: "new",
      dedupe_hash,
    });
    if (ins.error) throw new Error(ins.error.message);

    return NextResponse.json({ ok: true }, { status: 200, headers: cors });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500, headers: cors });
  }
}
