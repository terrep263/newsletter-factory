import { NextRequest, NextResponse } from "next/server";
import { buildAndPublishIssue } from "@/lib/assemble";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BRAND_352 = "c72c2449-2949-40f7-8b8f-1a1848190b38";

// Manual build trigger (admin). Builds a fresh issue draft into Letterman Drafts
// from the current selection. Review + send happen inside Letterman.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const brandId = (body && body.brand_id) || BRAND_352;
  try {
    const result = await buildAndPublishIssue(brandId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
