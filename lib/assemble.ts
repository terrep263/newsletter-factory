/**
 * Issue assembler — The 352 Beat.
 * Turns a balanced IssuePlan into a complete Letterman draft: grounded AI prose
 * (Letterman's own writer) for Top Story + Spotlight, templated evergreen voice
 * for Welcome/Reader Corner/CTA/Closing, templated Radar + Things To Do, real
 * business photos (keyless Google CDN), and event deep links. Records the issue
 * for lead-zone rotation. Server-side only (holds tokens).
 */
import { db } from "@/lib/supabase";
import { buildIssuePlan, type SelItem } from "@/lib/select";

const PK = process.env.GOOGLE_PLACES_API_KEY ?? "";
const LM_TOKEN = process.env.LETTERMAN_TOKEN ?? "";
const LM_BASE = process.env.LETTERMAN_BASE_URL ?? "https://api.letterman.ai/api";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const STORAGE_ID = "68d472e39810d7125b8f31f5"; // The 352 Beat publication/storage

function esc(s?: string | null): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function lm(method: string, path: string, body?: unknown): Promise<{ status: number; data: unknown }> {
  const res = await fetch(`${LM_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${LM_TOKEN}`,
      Accept: "application/json",
      "User-Agent": UA,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = text;
  try { data = JSON.parse(text); } catch { /* keep text */ }
  return { status: res.status, data };
}

async function aiGenerate(prompt: string): Promise<string> {
  const { data } = await lm("POST", "/prompt-output/generate/", { prompt });
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    return (o.promptOutPut as string) || (o.output as string) || "";
  }
  return "";
}

interface PlaceDetails { summary: string; reviews: string[]; }
async function placeDetails(placeId: string): Promise<PlaceDetails> {
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": PK,
        "X-Goog-FieldMask": "editorialSummary,reviews,rating,userRatingCount",
      },
      cache: "no-store",
    });
    if (!res.ok) return { summary: "", reviews: [] };
    const d = (await res.json()) as { editorialSummary?: { text?: string }; reviews?: Array<{ text?: { text?: string } }> };
    return {
      summary: d.editorialSummary?.text ?? "",
      reviews: (d.reviews ?? []).slice(0, 3).map((r) => (r.text?.text ?? "").slice(0, 240)).filter(Boolean),
    };
  } catch { return { summary: "", reviews: [] }; }
}

async function photoUri(photoName?: string | null): Promise<string | null> {
  if (!photoName) return null;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1100&skipHttpRedirect=true&key=${PK}`, { cache: "no-store" });
    if (!res.ok) return null;
    const d = (await res.json()) as { photoUri?: string };
    return d.photoUri ?? null;
  } catch { return null; }
}

function raw(it: SelItem) { return (it.raw ?? {}) as Record<string, unknown>; }

function spotlightPrompt(it: SelItem, det: PlaceDetails): string {
  const r = raw(it);
  const facts = `Business: ${it.title}\nTown: ${it.zone}, Florida\nCategory: ${r.category ?? ""}\nRating: ${r.rating} stars from ${r.reviews} Google reviews\nGoogle summary: ${det.summary || "none"}\nReview excerpts (tone + accurate detail only): ${det.reviews.length ? det.reviews.join(" | ") : "none"}`;
  return "You are writing the Business Spotlight for The 352 Beat, a warm, positive weekly community newsletter for Lake County, Florida (the 352). "
    + "Write a friendly 'story behind the business' of about 110-140 words.\nVoice: local, genuine, optimistic, conversational, never clickbait.\n"
    + "STRICT: Use ONLY the facts provided. Do NOT invent menu items, dishes, history, owners, prices, or awards. Only name a dish if it appears in the review excerpts. Do NOT mention any town other than the one given. Do not use the words 'nestled', 'tucked', or 'hidden gem'. Mention the star rating naturally. End with a one-line nudge to visit.\n\n"
    + facts;
}
function eventTopPrompt(it: SelItem): string {
  const r = raw(it);
  const facts = `Event: ${it.title}\nTown: ${it.zone}, Florida\nDate: ${it.event_date ?? ""}\nTime: ${r.eventTime ?? "see listing"}\nLocation: ${it.location ?? it.zone}`;
  return "You are writing the Top Story lead for The 352 Beat, a warm positive weekly community newsletter for Lake County, Florida (the 352). "
    + "Write one inviting paragraph of 70-100 words encouraging readers to check out this local happening this week.\nVoice: local, upbeat, genuine.\n"
    + "STRICT: Use ONLY the facts provided. Do NOT invent performers, prices, schedules, vendors, or details not given. Do NOT write placeholder text or brackets. Do NOT mention any town other than the one given. Do not restate the address. Do not include a link or say 'click here'.\n\n"
    + facts;
}

function paras(t: string): string {
  const blocks = t.trim().split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return blocks.length ? blocks.map((p) => `<p>${esc(p)}</p>`).join("") : `<p>${esc(t.trim())}</p>`;
}

const WELCOME = "<p>If you live in the 352 \u2014 from Leesburg and the Harris Chain of Lakes to Mount Dora's brick streets, the squares of The Villages, and the horse farms around Ocala \u2014 this one's for you.</p>"
  + "<p>The 352 Beat is a free weekly email about the place we actually live: the family-run spots worth the drive, the events worth leaving the house for, and the little discoveries that make this corner of Central Florida feel like home.</p>"
  + "<p><strong>Our promise:</strong> kept local, kept positive, and always worth your five minutes.</p>";
const READER = "<p>We're brand new and building this for you. Two quick ways to help:</p>"
  + "<p>1. <strong>What's one local thing you wish more people knew about?</strong> A business, an event, a hidden gem \u2014 we'll feature the best ones.</p>"
  + "<p>2. <strong>Who's a neighbor doing good?</strong> Point us to the people quietly making the 352 better.</p>"
  + "<p>Just hit reply \u2014 a real person reads every note.</p>";
const CTA = "<p>The 352 stays special because we show up for it. This week, pick one locally owned place you've never tried \u2014 a caf\u00e9, a shop, a market stall \u2014 and give it a shot. Then tell a friend (or tell us).</p>"
  + "<p><a href=\"https://the352beat.com/tip\">Share a Tip \u2192</a></p>";
const CLOSING = "<p>Next issue: a fresh business spotlight, more things to do, and another local gem worth discovering. Thanks for being one of our very first readers \u2014 it genuinely means a lot.</p>"
  + "<p><strong>\u2014 Robert, Taylor, Abby &amp; Lynn</strong><br>Robert \u00b7 Editor &nbsp;|&nbsp; Taylor, Abby &amp; Lynn \u00b7 Writers</p>";

export interface BuildResult {
  newsletterId: string | null;
  sections: Array<{ title: string; status: number }>;
  leadZone: string;
  zonesFeatured: string[];
  error?: string;
}

export async function buildAndPublishIssue(brandId: string, issueTitle = "The 352 Beat"): Promise<BuildResult> {
  const plan = await buildIssuePlan(brandId);
  if (!plan.spotlight) return { newsletterId: null, sections: [], leadZone: "", zonesFeatured: [], error: "no spotlight candidate" };
  const spot = plan.spotlight;
  const spotZone = spot.zone ?? "";
  const top = plan.topStory;
  const topZone = top?.zone ?? "";

  // Spotlight prose
  const spotDet = await placeDetails(String(raw(spot).place_id));
  const spotStory = await aiGenerate(spotlightPrompt(spot, spotDet));
  const spotPhoto = await photoUri(raw(spot).photo as string | undefined);
  const spotLink = (raw(spot).website as string) || (raw(spot).maps as string) || spot.url || "";
  const spotHtml = paras(spotStory)
    + `<p><a href="${esc(spotLink)}">Visit ${esc(spot.title)} \u2192</a></p>`
    + `<p style="font-size:13px;color:#666;">${esc(spot.location ?? "")}</p>`;

  // Top Story prose (business or event)
  let topStory = ""; let topPhoto: string | null = null; let topLink = ""; let topIsBiz = false;
  if (top && top.item_type === "business") {
    topIsBiz = true;
    const td = await placeDetails(String(raw(top).place_id));
    topStory = await aiGenerate(spotlightPrompt(top, td));
    topPhoto = await photoUri(raw(top).photo as string | undefined);
    topLink = (raw(top).website as string) || (raw(top).maps as string) || top.url || "";
  } else if (top) {
    topStory = await aiGenerate(eventTopPrompt(top));
    topLink = top.url ?? "";
  }
  const topHtml = top
    ? paras(topStory) + (topLink ? `<p><a href="${esc(topLink)}">${topIsBiz ? "Visit " + esc(top.title) + " \u2192" : "Event details \u2192"}</a></p>` : "")
    : "";

  // On Our Radar (3 businesses, editorial summary blurbs)
  let radarHtml = "<p>A few more 352 favorites worth knowing:</p>";
  for (const r of plan.radar) {
    const det = await placeDetails(String(raw(r).place_id));
    const blurb = det.summary || `A locally loved spot in ${r.zone} \u2014 ${raw(r).rating}\u2605 across ${raw(r).reviews} reviews.`;
    const mp = (raw(r).maps as string) || (raw(r).website as string) || r.url || "";
    radarHtml += `<p><strong>${esc(r.title)}</strong> \u2014 ${esc(r.zone)}<br>${esc(blurb)} (${raw(r).rating}\u2605)<br><a href="${esc(mp)}">See it on the map \u2192</a></p>`;
  }

  // Things To Do (events, teaser + deep link)
  let thingsHtml = "<p>A few local ways to get out \u2014 tap any event for details:</p>";
  for (const t of plan.thingsToDo) {
    const when = [t.event_date, (raw(t).eventTime as string) || "", t.location || ""].filter(Boolean).join(" \u00b7 ");
    thingsHtml += `<p>\U0001F4CD <strong>${esc(t.title)}</strong> \u2014 ${esc(t.zone)}<br><span style="font-size:13px;color:#666;">${esc(when)}</span><br><a href="${esc(t.url ?? "")}">Event details \u2192</a></p>`;
  }
  thingsHtml += "<p>Hosting something? <strong>Reply and tell us</strong> \u2014 we'll help spread the word.</p>";

  // Create newsletter + sections
  const { data: nlData } = await lm("POST", "/newsletters", { name: `${issueTitle}`, type: "NEWSLETTER", storageId: STORAGE_ID });
  const nid = (nlData as Record<string, unknown>)?._id as string | undefined;
  if (!nid) return { newsletterId: null, sections: [], leadZone: spotZone, zonesFeatured: plan.zonesFeatured, error: "newsletter create failed" };

  // clear any auto-created default sections
  const { data: cur } = await lm("GET", `/newsletters/${nid}/sections`);
  if (Array.isArray(cur)) for (const s of cur) await lm("DELETE", `/newsletters/${nid}/sections/${(s as Record<string, unknown>)._id}`);

  const sections: Array<{ title: string; type: string; body: string; img: string | null }> = [
    { title: "Welcome to The 352 Beat", type: "NEWSLETTER_HEADLINE_COMBO", body: WELCOME, img: null },
    { title: top ? `Top Story: ${top.title}` : "Top Story", type: "AI_ARTICLE", body: topHtml, img: topPhoto },
    { title: `Business Spotlight: ${spot.title}`, type: "AI_ARTICLE", body: spotHtml, img: spotPhoto },
    { title: "On Our Radar", type: "AI_ARTICLE", body: radarHtml, img: null },
    { title: "Things To Do Around the 352", type: "AI_ARTICLE", body: thingsHtml, img: null },
    { title: "Reader Corner", type: "AI_ARTICLE", body: READER, img: null },
    { title: "Support One Local Spot This Week", type: "AI_ARTICLE", body: CTA, img: null },
    { title: "See You Next Week", type: "AI_ARTICLE", body: CLOSING, img: null },
  ];
  const created: Array<{ title: string; status: number }> = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const { status, data } = await lm("POST", `/newsletters/${nid}/sections`, { title: s.title, type: s.type, promptOutPut: s.body, showTitle: true, index: i });
    created.push({ title: s.title, status });
    const sid = (data as Record<string, unknown>)?._id as string | undefined;
    if (sid && s.img) await lm("PUT", `/newsletters/${nid}/sections/${sid}`, { imageUrl: s.img, includeImage: true });
  }

  await db.from("issues").insert({
    brand_id: brandId,
    title: issueTitle,
    letterman_newsletter_id: nid,
    letterman_storage_id: STORAGE_ID,
    status: "draft",
    lead_zone: spotZone,
    featured_zones: plan.zonesFeatured,
  });

  return { newsletterId: nid, sections: created, leadZone: spotZone, zonesFeatured: plan.zonesFeatured };
}
