import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import lm from "@/lib/letterman";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.issue_id) return NextResponse.json({ error: "issue_id required" }, { status: 400 });

  const { data: issue, error: ie } = await db.from("issues").select("*").eq("id", b.issue_id).single();
  if (ie || !issue) return NextResponse.json({ error: ie?.message ?? "issue not found" }, { status: 404 });

  const { data: links, error: le } = await db
    .from("issue_items").select("content_item_id, position").eq("issue_id", b.issue_id).order("position");
  if (le) return NextResponse.json({ error: le.message }, { status: 500 });

  const ids = (links ?? []).map((l: { content_item_id: string }) => l.content_item_id);
  let items: Array<{ id: string; title: string; body: string | null; url: string | null }> = [];
  if (ids.length) {
    const { data: ci, error: ce } = await db.from("content_items").select("id, title, body, url").in("id", ids);
    if (ce) return NextResponse.json({ error: ce.message }, { status: 500 });
    const order = new Map<string, number>(ids.map((id: string, i: number) => [id, i]));
    items = (ci ?? []).sort((a: { id: string }, z: { id: string }) => (order.get(a.id)! - order.get(z.id)!));
  }

  try {
    const nl = (await lm.newsletters.create({ name: issue.title })) as Record<string, unknown>;
    const newsletterId = String(nl._id ?? nl.id ?? "");
    if (!newsletterId) throw new Error("Letterman did not return a newsletter id");

    for (const it of items) {
      const text = [it.body, it.url ? `Read more: ${it.url}` : ""].filter(Boolean).join("\n\n");
      await lm.newsletters.addSection(newsletterId, { type: "text", title: it.title, content: text || it.title });
    }

    await db.from("issues").update({
      letterman_newsletter_id: newsletterId,
      status: "generated",
      updated_at: new Date().toISOString(),
    }).eq("id", issue.id);

    if (ids.length) await db.from("content_items").update({ status: "used" }).in("id", ids);

    return NextResponse.json({ ok: true, letterman_newsletter_id: newsletterId, sections: items.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.from("issues").update({ status: "failed", error: msg }).eq("id", issue.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
