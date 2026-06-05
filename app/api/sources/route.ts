import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await db.from("content_sources").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: data });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.brand_id || !b?.name || !b?.source_type) {
    return NextResponse.json({ error: "brand_id, name, source_type required" }, { status: 400 });
  }
  const { data, error } = await db.from("content_sources").insert({
    brand_id: b.brand_id,
    name: b.name,
    source_type: b.source_type,
    url: b.url ?? null,
    county: b.county ?? null,
    config: b.config ?? {},
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ source: data }, { status: 201 });
}
