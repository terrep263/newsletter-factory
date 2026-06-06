import { NextRequest, NextResponse } from "next/server";
import { buildDraft } from "@/lib/factory";
import { discover } from "@/lib/discovery";
import { PUBLICATIONS, getPublication } from "@/config/publications";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// GET: list publications, or ?preview=<id> to see what discovery finds without creating a draft
export async function GET(req: NextRequest) {
  const preview = req.nextUrl.searchParams.get("preview");
  if (preview) {
    const pub = getPublication(preview);
    if (!pub) return NextResponse.json({ ok: false, error: "Unknown publication" }, { status: 404 });
    const result = await discover(pub);
    return NextResponse.json({ ok: true, publication: pub.name, total: result.total, byPillar: result.byPillar });
  }
  return NextResponse.json({
    ok: true,
    publications: PUBLICATIONS.map((p) => ({ id: p.id, name: p.name, draftDay: p.draftDay, sendDay: p.sendDayLabel, pillars: p.pillars.map((pl) => pl.label) })),
  });
}

// POST { publicationId }: run discovery + build a populated Letterman draft
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const id = String(b?.publicationId ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "publicationId required" }, { status: 400 });
  const result = await buildDraft(id);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
