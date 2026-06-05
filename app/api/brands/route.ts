import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await db.from("brands").select("*").order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brands: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.slug) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }
  const { data, error } = await db.from("brands").insert({
    name: body.name,
    slug: body.slug,
    coverage: body.coverage ?? [],
    from_name: body.from_name ?? null,
    from_email: body.from_email ?? null,
    letterman_publication_id: body.letterman_publication_id ?? null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brand: data }, { status: 201 });
}
