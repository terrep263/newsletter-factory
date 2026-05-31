import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET — list issues (most recent first)
export async function GET(req: NextRequest) {
  const brandId = new URL(req.url).searchParams.get("brand_id");
  let q = db.from("issues").select("*").order("created_at", { ascending: false }).limit(100);
  if (brandId) q = q.eq("brand_id", brandId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ issues: data });
}

// POST — create an issue from approved inbox items
// { brand_id, title, item_ids: [...] }
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.brand_id || !b?.title) {
    return NextResponse.json({ error: "brand_id and title required" }, { status: 400 });
  }
  const { data: issue, error } = await db.from("issues").insert({
    brand_id: b.brand_id, title: b.title, status: "draft",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const itemIds: string[] = Array.isArray(b.item_ids) ? b.item_ids : [];
  if (itemIds.length) {
    const rows = itemIds.map((cid, i) => ({ issue_id: issue.id, content_item_id: cid, position: i }));
    const link = await db.from("issue_items").insert(rows);
    if (link.error) return NextResponse.json({ error: link.error.message }, { status: 500 });
  }
  return NextResponse.json({ issue }, { status: 201 });
}
