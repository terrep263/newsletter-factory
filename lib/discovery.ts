// Discovery engine: turns each publication pillar into a Google News query-feed,
// fetches it as RSS, and applies the LOCAL + ACCURATE-source + FIT gates.
// SERVER ONLY. Facts are never invented here; this only selects source URLs.

import { FLORIDA_SIGNAL, type Publication, type Pillar } from "@/config/publications";

export interface DiscoveredItem {
  pillar: string;
  pillarLabel: string;
  title: string;
  link: string;
  source: string;
  pubDate: string;
}

const UA = "Mozilla/5.0 (compatible; NewsletterFactory/1.0; +https://thenewsletterfactory.com)";

function gnewsUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

function buildQuery(pub: Publication, pillar: Pillar): string {
  const terms = pillar.terms.map((t) => `"${t}"`).join(" OR ");
  if (pillar.statewide) return `Florida (${terms})`;
  const geo = pub.anchors.map((a) => `"${a}"`).join(" OR ");
  return `Florida (${geo}) (${terms})`;
}

function parseRss(xml: string): Array<{ title: string; link: string; source: string; pubDate: string }> {
  const out: Array<{ title: string; link: string; source: string; pubDate: string }> = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  const pick = (block: string, tag: string): string => {
    const mm = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return mm ? mm[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim() : "";
  };
  while ((m = re.exec(xml))) {
    const b = m[1];
    out.push({ title: pick(b, "title"), link: pick(b, "link"), source: pick(b, "source"), pubDate: pick(b, "pubDate") });
  }
  return out;
}

function flConfirmed(pub: Publication, hay: string): boolean {
  if (pub.flUnique.some((t) => hay.includes(t))) return true;
  return pub.ambiguous.some((t) => hay.includes(t)) && FLORIDA_SIGNAL.some((s) => hay.includes(s));
}

function fits(pub: Publication, pillar: Pillar, title: string, source: string): boolean {
  const hay = `${title} ${source}`.toLowerCase();
  if (pub.exclude.some((x) => hay.includes(x))) return false;
  if (pillar.statewide) return hay.includes("florida");
  return flConfirmed(pub, hay);
}

async function fetchPillar(pub: Publication, pillar: Pillar, seen: Set<string>): Promise<DiscoveredItem[]> {
  let xml = "";
  try {
    const res = await fetch(gnewsUrl(buildQuery(pub, pillar)), { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) return [];
    xml = await res.text();
  } catch {
    return [];
  }
  const items = parseRss(xml);
  const kept: DiscoveredItem[] = [];
  for (const it of items) {
    if (!it.title || !it.link) continue;
    const dedupe = it.title.toLowerCase().slice(0, 55);
    if (seen.has(dedupe)) continue;
    if (!fits(pub, pillar, it.title, it.source)) continue;
    seen.add(dedupe);
    kept.push({ pillar: pillar.key, pillarLabel: pillar.label, title: it.title, link: it.link, source: it.source, pubDate: it.pubDate });
    if (kept.length >= pillar.max) break;
  }
  return kept;
}

export interface DiscoveryResult {
  byPillar: Record<string, DiscoveredItem[]>;
  all: DiscoveredItem[];
  total: number;
}

export async function discover(pub: Publication): Promise<DiscoveryResult> {
  const seen = new Set<string>();
  const byPillar: Record<string, DiscoveredItem[]> = {};
  const all: DiscoveredItem[] = [];
  for (const pillar of pub.pillars) {
    const items = await fetchPillar(pub, pillar, seen);
    byPillar[pillar.key] = items;
    all.push(...items);
  }
  return { byPillar, all, total: all.length };
}
