import { NextRequest, NextResponse } from "next/server";
import { collectBrand } from "@/lib/collector";
import { buildAndPublishIssue } from "@/lib/assemble";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BRAND_352 = "c72c2449-2949-40f7-8b8f-1a1848190b38";

/**
 * Weekly build endpoint. Collects fresh sources, then assembles a complete
 * Issue draft into Letterman Drafts for review + send inside Letterman.
 * Guarded by CRON_SECRET. Intended to run Wednesday afternoon (ready by 6 PM ET).
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key || key !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const skipCollect = req.nextUrl.searchParams.get("skipCollect") === "1";
  try {
    const collected = skipCollect ? null : await collectBrand(BRAND_352);
    const result = await buildAndPublishIssue(BRAND_352);
    return NextResponse.json({ ok: true, collected, result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
