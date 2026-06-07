/**
 * Issue assembly — shared by the manual push route and the weekly cron.
 * Turns a factory.issues row (+ issue_items) into a Letterman newsletter draft:
 * AI-writes every item (Florida-pinned), uses real block types + promptOutPut,
 * creates the newsletter WITH storageId (Drafts visibility), sets source images,
 * and orders sections in the 352 format. Server-side only.
 */
import { db } from "@/lib/supabase";
import lm from "@/lib/letterman";

const GEO = "Central Florida's 352 area (Lake, Marion, Sumter and neighboring counties)";
const STYLE = { width: "600", borderRadius: "5", marginBottom: "10" };

export type Item = {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  image_url: string | null;
  item_type: string | null;
};

export interface AssembleResult {
  ok: true;
  letterman_newsletter_id: string;
  storageId: string;
  sections: number;
}

export class AssembleError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
    this.name = "AssembleError";
  }
}

function writePrompt(it: Item): string {
  return [
    `You are an editor for The 352 Beat, a hyperlocal weekly newsletter for ${GEO}.`,
    `Rewrite the SOURCE into a brief, warm 1-3 sentence newsletter blurb.`,
    `STRICT RULES:`,
    `- Use ONLY facts stated in the source. Do NOT add place names, people, numbers, dates, organizations, or details that are not in the source.`,
    `- Do NOT mention any town or county unless it literally appears in the source.`,
    `- If the source is only a headline with no detail, write ONE neutral sentence based solely on that headline.`,
    `- Never mention California or any Lake County outside Florida.`,
    `SOURCE TITLE: ${it.title}`,
    `SOURCE SUMMARY: ${it.body ? it.body : "(headline only)"}`,
  ].join("\n");
}

async function aiWrite(it: Item): Promise<string> {
  try {
    const r = (await lm.ai.generate({ prompt: writePrompt(it) })) as Record<string, unknown>;
    const out = String(r.promptOutPut ?? "").trim();
    return out || (it.body ?? it.title);
  } catch {
    return it.body ?? it.title;
  }
}

function imageFields(it: Item): Record<string, unknown> {
  if (it.image_url) {
    return { includeImage: true, imageUrl: it.image_url, imageBelowTitle: true };
  }
  return { includeImage: false };
}

async function buildSection(
  newsletterId: string, index: number, type: string,
  title: string, promptOutPut: string, withImage: boolean, it?: Item,
): Promise<void> {
  const created = (await lm.newsletters.addSection(newsletterId, {
    title, type, promptOutPut, style: STYLE, index,
  })) as Record<string, unknown>;
  const sid = String(created._id ?? "");
  if (!sid || !withImage || !it) return;
  await lm.newsletters.updateSection(newsletterId, sid, {
    title, type, urlType: "CONTENT", index,
    promptOutPut, showTitle: true, state: "DRAFT", status: true, style: STYLE,
    ...imageFields(it),
  });
}

export async function assembleIssue(issueId: string): Promise<AssembleResult> {
  const { data: issue, error: ie } = await db.from("issues").select("*").eq("id", issueId).single();
  if (ie || !issue) throw new AssembleError(ie?.message ?? "issue not found", 404);

  const { data: brand, error: be } = await db
    .from("brands").select("letterman_publication_id").eq("id", issue.brand_id).single();
  if (be) throw new AssembleError(be.message, 500);
  const storageId = brand?.letterman_publication_id as string | null;
  if (!storageId) throw new AssembleError("brand has no letterman_publication_id", 400);

  const { data: links, error: le } = await db
    .from("issue_items").select("content_item_id, position").eq("issue_id", issueId).order("position");
  if (le) throw new AssembleError(le.message, 500);

  const ids = (links ?? []).map((l: { content_item_id: string }) => l.content_item_id);
  let items: Item[] = [];
  if (ids.length) {
    const { data: ci, error: ce } = await db
      .from("content_items").select("id, title, body, url, image_url, item_type").in("id", ids);
    if (ce) throw new AssembleError(ce.message, 500);
    const order = new Map<string, number>(ids.map((id: string, i: number) => [id, i]));
    items = (ci ?? []).sort((a: Item, z: Item) => (order.get(a.id)! - order.get(z.id)!));
  }
  if (!items.length) throw new AssembleError("issue has no items", 400);

  const stories = items.filter((i) => (i.item_type ?? "story") === "story");
  const events = items.filter((i) => i.item_type === "event");
  const permits = items.filter((i) => i.item_type === "permit");
  const other = items.filter((i) => !(["story", "event", "permit"].includes(i.item_type ?? "story")));
  const lead = stories[0] ?? items[0];
  const radar = stories.filter((i) => i.id !== lead.id);

  try {
    const nl = (await lm.newsletters.create({
      name: issue.title, storageId, term: `The 352 Beat — ${GEO}`,
    })) as Record<string, unknown>;
    const newsletterId = String(nl._id ?? nl.id ?? "");
    if (!newsletterId) throw new Error("Letterman did not return a newsletter id");

    let idx = 0; let sections = 0;
    await buildSection(newsletterId, idx++, "NEWSLETTER_HEADLINE_COMBO", lead.title, await aiWrite(lead), true, lead);
    sections++;

    const emitGroup = async (heading: string, group: Item[]) => {
      if (!group.length) return;
      await buildSection(newsletterId, idx++, "TITLE", heading, "", false);
      sections++;
      for (const it of group) {
        await buildSection(newsletterId, idx++, "AI_ARTICLE", it.title, await aiWrite(it), true, it);
        sections++;
      }
    };
    await emitGroup("On Our Radar", radar);
    await emitGroup("Around the 352 This Week", events);
    await emitGroup("Development & Permits", permits);
    await emitGroup("More from the 352", other);

    await db.from("issues").update({
      letterman_newsletter_id: newsletterId,
      letterman_storage_id: storageId,
      status: "generated",
      updated_at: new Date().toISOString(),
    }).eq("id", issue.id);

    if (ids.length) await db.from("content_items").update({ status: "used" }).in("id", ids);

    return { ok: true, letterman_newsletter_id: newsletterId, storageId, sections };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.from("issues").update({ status: "failed", error: msg }).eq("id", issue.id);
    throw new AssembleError(msg, 500);
  }
}
