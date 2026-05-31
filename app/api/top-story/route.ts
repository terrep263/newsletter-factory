import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const BEAT_352 = "c72c2449-2949-40f7-8b8f-1a1848190b38";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// Returns the current Top Story of the Week for a brand (most recent wins).
export async function GET(req: Request) {
  const brandId = new URL(req.url).searchParams.get("brand_id") || BEAT_352;
  try {
    const { data, error } = await db
      .from("top_story")
      .select("headline, blurb, location, image_url, link_url, created_at")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    const story = (data && data[0]) || null;
    return NextResponse.json({ story }, { headers: CORS });
  } catch (e) {
    return NextResponse.json(
      { story: null, error: e instanceof Error ? e.message : String(e) },
      { status: 200, headers: CORS },
    );
  }
}
