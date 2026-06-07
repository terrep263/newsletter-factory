/**
 * Issue selection engine — The 352 Beat.
 * Builds a balanced issue plan from collected content_items:
 *  - equal-weight round-robin across town zones (no town dominates)
 *  - per-zone caps + distinct zones across Top Story / Spotlight / Radar
 *  - lead rotation (Spotlight avoids recently featured zones)
 *  - administrative calendar items filtered out of Things To Do
 *  - events: upcoming only, soonest first
 */
import { db } from "@/lib/supabase";

export interface SelItem {
  id: string;
  item_type: string;
  title: string;
  body: string | null;
  url: string | null;
  image_url: string | null;
  zone: string | null;
  event_date: string | null;
  location: string | null;
  raw: Record<string, unknown> | null;
}

export interface IssuePlan {
  topStory: SelItem | null;
  topStoryKind: "event" | "business" | null;
  spotlight: SelItem | null;
  radar: SelItem[];
  thingsToDo: SelItem[];
  zonesFeatured: string[];
}

// Civic/administrative items that are not "things to do".
const ADMIN = /\b(city council|council meeting|commission meeting|board meeting|board of|workshop|agenda|budget|public hearing|hearing|election|candidate|qualifying|cra meeting|advisory|planning (and|&) zoning|p&z|special magistrate|canvassing|swearing|proclamation|closed session|executive session|committee)\b/i;
// Marquee, high-interest public happenings preferred for the Top Story lead.
const MARQUEE = /\b(festival|market|concert|fair|music|live|celebration|parade|art walk|food truck|farmers|holiday|fireworks|craft|expo|show|movie|family)\b/i;

function isThingToDo(it: SelItem): boolean {
  return !ADMIN.test(`${it.title} ${it.location ?? ""}`);
}
function bizScore(it: SelItem): number {
  const r = Number(it.raw?.rating ?? 0);
  const n = Number(it.raw?.reviews ?? 0);
  return r + Math.log10(n + 1);
}

/** Round-robin across zones: <= perZone per zone, total <= limit; non-excluded zones first, excluded as fallback. */
function roundRobinByZone(items: SelItem[], limit: number, perZone: number, exclude: Set<string>): SelItem[] {
  const byZone = new Map<string, SelItem[]>();
  for (const it of items) {
    const z = it.zone ?? "_";
    if (!byZone.has(z)) byZone.set(z, []);
    byZone.get(z)!.push(it);
  }
  const open = [...byZone.keys()].filter((z) => !exclude.has(z));
  const fallback = [...byZone.keys()].filter((z) => exclude.has(z));
  const order = [...open, ...fallback];
  const picked: SelItem[] = [];
  const counts = new Map<string, number>();
  let progress = true;
  while (picked.length < limit && progress) {
    progress = false;
    for (const z of order) {
      if (picked.length >= limit) break;
      if ((counts.get(z) ?? 0) >= perZone) continue;
      const pool = byZone.get(z)!;
      if (!pool.length) continue;
      picked.push(pool.shift()!);
      counts.set(z, (counts.get(z) ?? 0) + 1);
      progress = true;
    }
  }
  return picked;
}

export async function buildIssuePlan(brandId: string): Promise<IssuePlan> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: recent } = await db.from("issues")
    .select("lead_zone").eq("brand_id", brandId)
    .order("created_at", { ascending: false }).limit(4);
  const recentLeadZones = new Set(((recent ?? []) as { lead_zone: string | null }[])
    .map((r) => r.lead_zone).filter(Boolean) as string[]);

  const { data: bizData } = await db.from("content_items").select("*")
    .eq("brand_id", brandId).eq("item_type", "business").eq("status", "new");
  const businesses = ((bizData ?? []) as SelItem[]).sort((a, b) => bizScore(b) - bizScore(a));

  const { data: evData } = await db.from("content_items").select("*")
    .eq("brand_id", brandId).eq("item_type", "event").eq("status", "new")
    .gte("event_date", today).order("event_date", { ascending: true });
  const events = ((evData ?? []) as SelItem[]).filter(isThingToDo);

  // Spotlight: top-scored business from a zone not recently featured (rotation).
  const spotPool = businesses.filter((b) => !recentLeadZones.has(b.zone ?? ""));
  const spotlight = spotPool[0] ?? businesses[0] ?? null;
  const spotZone = spotlight?.zone ?? "";

  // Top Story: marquee event from another town if available; else a notable business discovery.
  const marquee = events.filter((e) => e.zone !== spotZone && MARQUEE.test(e.title));
  const topBiz = businesses.filter((b) => b.id !== spotlight?.id && b.zone !== spotZone);
  const topEventAny = events.filter((e) => e.zone !== spotZone);
  const topStory = marquee[0] ?? topBiz[0] ?? topEventAny[0] ?? null;
  const topStoryKind: "event" | "business" | null =
    topStory ? (topStory.item_type === "event" ? "event" : "business") : null;
  const topZone = topStory?.zone ?? "";

  // On Our Radar: 3 businesses, distinct towns, excluding spotlight & top-story towns.
  const radar = roundRobinByZone(
    businesses.filter((b) => b.id !== spotlight?.id && b.id !== topStory?.id),
    3, 1, new Set([spotZone, topZone].filter(Boolean))
  );

  // Things To Do: 4 events, distinct towns (max 2 per town).
  const thingsToDo = roundRobinByZone(
    events.filter((e) => e.id !== topStory?.id),
    4, 2, new Set()
  );

  const zonesFeatured = [...new Set(
    [topZone, spotZone, ...radar.map((r) => r.zone ?? ""), ...thingsToDo.map((t) => t.zone ?? "")]
      .filter(Boolean)
  )];

  return { topStory, topStoryKind, spotlight, radar, thingsToDo, zonesFeatured };
}
