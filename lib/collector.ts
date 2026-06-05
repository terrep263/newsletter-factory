/**
 * The 352 Collector — Newsletter Factory
 * Pulls items from a brand's content_sources into content_items.
 * v1 supports RSS/Atom sources.
 */
import { db } from "@/lib/supabase";
import crypto from "crypto";

export interface NormalizedItem {
  item_type: string;
  title: string;
  body?: string | null;
  url?: string | null;
  event_date?: string | null;
  location?: string | null;
  raw?: Record<string, unknown>;
}

export interface CollectResult {
  source_id: string;
  source_name: string;
  fetched: number;
  inserted: number;
  skipped: number;
  error?: string;
}

function hash(brandId: string, title: string, url?: string | null): string {
  return crypto
    .createHash("sha256")
    .update(`${brandId}|${(title || "").trim().toLowerCase()}|${(url || "").trim()}`)
    .digest("hex");
}

function pick(block: string, tags: string[]): string | null {
  for (const tag of tags) {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const m = block.match(re);
    if (m) {
      return m[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ")
        .trim();
    }
  }
  return null;
}

function pickAttr(block: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["']`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function toISODate(d?: string | null): string | null {
  if (!d) return null;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

async function fetchRss(url: string, defaultType: string): Promise<NormalizedItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "NewsletterFactory/1.0 (+thenewsletterfactory.com)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`RSS fetch ${res.status}`);
  const xml = await res.text();

  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/\1>/gi) ?? [];
  return blocks.slice(0, 40).map((b) => {
    const title = pick(b, ["title"]) ?? "(untitled)";
    let link = pick(b, ["link"]);
    if (!link) link = pickAttr(b, "link", "href");
    const body = pick(b, ["description", "summary", "content:encoded", "content"]);
    const date = toISODate(pick(b, ["pubDate", "published", "updated", "dc:date"]));
    return {
      item_type: defaultType,
      title,
      body: body ? body.slice(0, 1200) : null,
      url: link,
      event_date: defaultType === "event" ? date : null,
      raw: { pubDate: date },
    };
  });
}

type Fetcher = (url: string, defaultType: string) => Promise<NormalizedItem[]>;
const FETCHERS: Record<string, Fetcher> = {
  rss: fetchRss,
  atom: fetchRss,
};

export async function collectSource(source: {
  id: string; brand_id: string; name: string; source_type: string;
  url?: string | null; config?: Record<string, unknown>;
}): Promise<CollectResult> {
  const result: CollectResult = {
    source_id: source.id, source_name: source.name,
    fetched: 0, inserted: 0, skipped: 0,
  };
  try {
    const fetcher = FETCHERS[source.source_type];
    if (!fetcher) throw new Error(`No fetcher for source_type "${source.source_type}"`);
    if (!source.url) throw new Error("Source has no URL");

    const defaultType = (source.config?.item_type as string) || "story";
    const items = await fetcher(source.url, defaultType);
    result.fetched = items.length;

    for (const it of items) {
      const dedupe_hash = hash(source.brand_id, it.title, it.url);
      const existing = await db
        .from("content_items").select("id", { head: true, count: "exact" })
        .eq("dedupe_hash", dedupe_hash);
      if ((existing.count ?? 0) > 0) { result.skipped++; continue; }

      const ins = await db.from("content_items").insert({
        brand_id: source.brand_id,
        source_id: source.id,
        item_type: it.item_type,
        title: it.title,
        body: it.body ?? null,
        url: it.url ?? null,
        event_date: it.event_date ?? null,
        location: it.location ?? null,
        raw: it.raw ?? {},
        status: "new",
        dedupe_hash,
      });
      if (ins.error) {
        if (String(ins.error.code) === "23505") result.skipped++;
        else throw new Error(ins.error.message);
      } else {
        result.inserted++;
      }
    }

    await db.from("content_sources").update({ last_pulled_at: new Date().toISOString() }).eq("id", source.id);
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
  }
  return result;
}

export async function collectBrand(brandId: string): Promise<CollectResult[]> {
  const { data: sources, error } = await db
    .from("content_sources").select("*").eq("brand_id", brandId).eq("active", true);
  if (error) throw new Error(error.message);
  const results: CollectResult[] = [];
  for (const s of (sources ?? [])) results.push(await collectSource(s));
  return results;
}
