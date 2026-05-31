import { NextRequest, NextResponse } from "next/server";
import { collectBrand } from "@/lib/collector";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST { brand_id }  -> runs all active sources for the brand
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.brand_id) return NextResponse.json({ error: "brand_id required" }, { status: 400 });
  try {
    const results = await collectBrand(b.brand_id);
    const totals = results.reduce(
      (a, r) => ({ inserted: a.inserted + r.inserted, skipped: a.skipped + r.skipped, fetched: a.fetched + r.fetched }),
      { inserted: 0, skipped: 0, fetched: 0 },
    );
    return NextResponse.json({ totals, results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
