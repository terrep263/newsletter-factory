import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET ?status=new&brand_id=...
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "new";
  const brandId = url.searchParams.get("brand_id");
  let q = db.from("content_items").select("*").order("created_at", { ascending: false }).limit(200);
  if (status !== "all") q = q.eq("status", status);
  if (brandId) q = q.eq("brand_id", brandId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data });
}

// PATCH { id, status }  status in: approved | rejected | new
export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.id || !b?.status) return NextResponse.json({ error: "id and status required" }, { status: 400 });
  const { data, error } = await db.from("content_items").update({ status: b.status }).eq("id", b.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data });
}
