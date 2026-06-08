/**
 * Email renderer for The 352 Beat — produces the full PDF-style HTML email
 * (the approved design) from live content. Server-side only.
 * Selection (marquee-first Top Story, routine filtered), grounded AI prose via
 * Letterman's writer, Google Places details + keyless photos, then the branded
 * HTML document that Newsletterly will send as-is.
 */
import { db } from "@/lib/supabase";

const PK = process.env.GOOGLE_PLACES_API_KEY ?? "";
const LM = process.env.LETTERMAN_TOKEN ?? "";
const LMB = process.env.LETTERMAN_BASE_URL ?? "https://api.letterman.ai/api";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

type Row = Record<string, any>;
const raw = (it: Row) => (it?.raw ?? {}) as Record<string, any>;
function esc(s?: string | null): string {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function aiGenerate(prompt: string): Promise<string> {
  try {
    const res = await fetch(`${LMB}/prompt-output/generate/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${LM}`, Accept: "application/json", "User-Agent": UA, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }), cache: "no-store",
    });
    const d = await res.json().catch(() => ({}));
    return (d?.promptOutPut as string) || (d?.output as string) || "";
  } catch { return ""; }
}

interface Det { summary: string; reviews: string[]; }
async function placeDetails(placeId: string, reviews = false): Promise<Det> {
  try {
    const fm = "editorialSummary,rating,userRatingCount" + (reviews ? ",reviews" : "");
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: { "X-Goog-Api-Key": PK, "X-Goog-FieldMask": fm }, cache: "no-store",
    });
    if (!res.ok) return { summary: "", reviews: [] };
    const d = await res.json();
    return {
      summary: d.editorialSummary?.text ?? "",
      reviews: (d.reviews ?? []).slice(0, 3).map((r: any) => (r.text?.text ?? "").slice(0, 160)).filter(Boolean),
    };
  } catch { return { summary: "", reviews: [] }; }
}
async function photoUri(pn?: string | null): Promise<string | null> {
  if (!pn) return null;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/${pn}/media?maxWidthPx=1100&skipHttpRedirect=true&key=${PK}`, { cache: "no-store" });
    if (!res.ok) return null;
    const d = await res.json();
    return d.photoUri ?? null;
  } catch { return null; }
}

function cleanLoc(s?: string | null): string {
  if (!s) return "";
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  s = s.replace(/(?<=[a-z0-9])(Mount Dora|The Villages|Lady Lake|Leesburg|Eustis|Tavares|Clermont|Ocala|Mount|Lake)/g, ", $1");
  return s.replace(/\s+/g, " ").trim().replace(/^,|,$/g, "").trim();
}
function cleanProse(t: string): string {
  const blocks = t.trim().split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const good = blocks.filter((b) => /^[A-Z]/.test(b) && b.length > 40 && !/^(I |We |My |The brisket|Overall,)/.test(b));
  return (good.length ? good : blocks).join(" ");
}

const ADMIN = /\b(city council|council meeting|commission|board meeting|board of|workshop|agenda|budget|public hearing|hearing|election|candidate|qualifying|cra meeting|advisory|planning|p&z|magistrate|canvassing|swearing|proclamation|committee)\b/i;
const MARQUEE = /\b(festival|market|concert|fair|live music|music|celebration|parade|art walk|food truck|farmers|holiday|fireworks|craft fair|expo|wine|brew|tasting|gala|night out|movie night|family fun|cars)\b/i;
const ROUTINE = /\b(support group|story ?time|sensory|book club|knit|crochet|needle|yoga|pickleball|board game|bingo|line danc|mahjong|canasta|bridge club|toastmasters|aa meeting|al-anon|blood drive|tech help|computer class|story hour|playgroup|take ?& ?make|take and make|martial arts|karate|jiu|taekwondo|dance class|fitness|zumba|workout|class|rehearsal|lessons?)\b/i;
const CHAINS = ["harry","mission bbq","sonny","bono","beef ","bonefish","carrabba","first watch","keke","metro diner","red lobster","olive garden","outback","texas roadhouse","longhorn","cracker barrel","applebee","chili","ihop","denny","buffalo wild","hooters","panera","chipotle","five guys","zaxby","culver","sonic","panda express","tijuana","pollo tropical","smoothie king","tropical smoothie","crumbl","baskin","cold stone","jeremiah","great clips","sport clips","supercuts","massage envy","planet fitness","7 brew","foxtail","ellianos","scooter","biggby","starbucks","mcdonald","wendy","subway","dunkin","wawa","domino"];
const isChain = (n: string) => CHAINS.some((c) => n.toLowerCase().includes(c));
const bscore = (b: Row) => (raw(b).rating ?? 0) + Math.log10(((raw(b).reviews ?? 0)) + 1);

function rr(items: Row[], limit: number, per: number, exclude: Set<string>): Row[] {
  const bz: Record<string, Row[]> = {};
  for (const it of items) (bz[it.zone || "_"] ||= []).push(it);
  const order = [...Object.keys(bz).filter((z) => !exclude.has(z)), ...Object.keys(bz).filter((z) => exclude.has(z))];
  const out: Row[] = []; const c: Record<string, number> = {}; let prog = true;
  while (out.length < limit && prog) {
    prog = false;
    for (const z of order) {
      if (out.length >= limit) break;
      if ((c[z] ?? 0) >= per || !bz[z].length) continue;
      out.push(bz[z].shift()!); c[z] = (c[z] ?? 0) + 1; prog = true;
    }
  }
  return out;
}

function spotPrompt(it: Row, summ: string, revs: string[]): string {
  const r = raw(it);
  const facts = `Business: ${it.title}\nTown: ${it.zone}, Florida\nCategory: ${r.category}\nRating: ${r.rating} stars from ${r.reviews} Google reviews\nGoogle summary: ${summ || "none"}\nReview themes (for tone only): ${revs.length ? revs.join(" | ") : "none"}`;
  return "You are writing the Business Spotlight for The 352 Beat, a warm, positive weekly community newsletter for Lake County, Florida (the 352). "
    + "Write ONE flowing paragraph of about 110-140 words \u2014 the friendly 'story behind the business'.\nVoice: local, genuine, optimistic, conversational, never clickbait.\n"
    + "STRICT: Use ONLY the facts provided. Do NOT quote, copy, or paraphrase individual reviews. Do NOT begin mid-sentence. Do NOT invent menu items, history, owners, prices, or awards. Do NOT mention any town other than the one given. Do not use 'nestled', 'tucked', or 'hidden gem'. Mention the star rating naturally. End with a one-line nudge to visit.\n\n" + facts;
}

export interface RenderResult { title: string; html: string; leadZone: string; zonesFeatured: string[]; topTitle: string; spotTitle: string; }

export async function renderIssue(brandId: string, issueTitle = "The 352 Beat \u2014 Issue #1"): Promise<RenderResult> {
  const today = new Date().toISOString().slice(0, 10);
  const recent = (await db.from("issues").select("lead_zone").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(4)).data ?? [];
  const recentZ = new Set(recent.map((r: Row) => r.lead_zone).filter(Boolean));

  const bizRows = ((await db.from("content_items").select("*").eq("brand_id", brandId).eq("item_type", "business").eq("status", "new")).data ?? []) as Row[];
  const biz = bizRows.filter((b) => !isChain(b.title)).sort((a, b) => bscore(b) - bscore(a));
  const evRows = ((await db.from("content_items").select("*").eq("brand_id", brandId).eq("item_type", "event").eq("status", "new").gte("event_date", today)).data ?? []) as Row[];
  const events = evRows.filter((e) => !ADMIN.test(e.title));
  const goodEvents = events.filter((e) => !ROUTINE.test(e.title))
    .sort((a, b) => ((MARQUEE.test(b.title) ? 5 : 0) - (MARQUEE.test(a.title) ? 5 : 0)) || String(a.event_date || "").localeCompare(String(b.event_date || "")));

  if (!biz.length) throw new Error("no business candidates");
  const spot = biz.find((b) => !recentZ.has(b.zone)) ?? biz[0]; const spotZ = spot.zone;
  const marquee = goodEvents.filter((e) => e.zone !== spotZ && MARQUEE.test(e.title));
  const topev = goodEvents.filter((e) => e.zone !== spotZ);
  const topbiz = biz.filter((b) => b.id !== spot.id && b.zone !== spotZ);
  const top: Row | null = marquee[0] ?? topev[0] ?? topbiz[0] ?? null;
  const topZ = top?.zone ?? "";
  const topIsBiz = !!top && top.item_type === "business";
  const radar = rr(biz.filter((b) => b.id !== spot.id && b.id !== (top?.id)), 3, 1, new Set([spotZ, topZ].filter(Boolean)));
  const things = rr(goodEvents.filter((e) => e.id !== (top?.id)), 4, 2, new Set());
  const zonesFeatured = Array.from(new Set([topZ, spotZ, ...radar.map((r) => r.zone), ...things.map((t) => t.zone)].filter(Boolean)));

  const sd = await placeDetails(String(raw(spot).place_id), true);
  const spotStory = cleanProse(await aiGenerate(spotPrompt(spot, sd.summary, sd.reviews)));
  const spotPhoto = await photoUri(raw(spot).photo);

  let topStory = ""; let topPhoto: string | null = null;
  if (topIsBiz && top) {
    const td = await placeDetails(String(raw(top).place_id), true);
    topStory = cleanProse(await aiGenerate(spotPrompt(top, td.summary, td.reviews)));
    topPhoto = await photoUri(raw(top).photo);
  } else if (top) {
    const r = raw(top);
    const ef = `Event: ${top.title}\nTown: ${topZ}, Florida\nDate: ${top.event_date}\nTime: ${r.eventTime ?? "see listing"}\nLocation: ${cleanLoc(top.location || topZ)}`;
    topStory = cleanProse(await aiGenerate("You are writing the Top Story lead for The 352 Beat, a warm positive weekly community newsletter for Lake County, Florida (the 352). "
      + "Write ONE inviting paragraph of 70-100 words encouraging readers to check out this local happening this week.\nVoice: local, upbeat, genuine.\n"
      + "STRICT: Use ONLY the facts provided. Do NOT invent performers, prices, schedules, or vendors. Do NOT write placeholder text or brackets. Do NOT mention any town other than the one given. Do not include a link or say 'click here'.\n\n" + ef));
  }

  const bizLink = (it: Row) => raw(it).website || raw(it).maps || it.url || "#";
  const topLink = topIsBiz && top ? bizLink(top) : (top?.url ?? "#");

  let radarHtml = "";
  for (const r of radar) {
    const det = await placeDetails(String(raw(r).place_id));
    const blurb = det.summary || `A locally loved spot in ${r.zone}, earning ${raw(r).rating}\u2605 across ${raw(r).reviews} reviews.`;
    radarHtml += `<div class="fav"><span class="name">${esc(r.title)}</span> &nbsp;<span class="where">${esc(r.zone)}</span>`
      + `<p>${esc(blurb)} <span class="rating">${raw(r).rating}\u2605</span></p>`
      + `<p style="margin-top:4px;"><a class="maplink" href="${esc(raw(r).maps || raw(r).website || "#")}">See it on the map \u2192</a></p></div>`;
  }

  const EMOJI: Record<string, string> = { market: "\uD83D\uDED2", music: "\uD83C\uDFB6", concert: "\uD83C\uDFB6", festival: "\uD83C\uDF89", food: "\uD83C\uDF2E", cars: "\uD83D\uDE97", art: "\uD83C\uDFA8" };
  let thingsHtml = "";
  for (const t of things) {
    const tl = t.title.toLowerCase();
    const ic = Object.entries(EMOJI).find(([k]) => tl.includes(k))?.[1] ?? "\uD83D\uDCCD";
    const meta = [t.event_date, raw(t).eventTime, cleanLoc(t.location)].filter(Boolean).join(" \u00b7 ");
    thingsHtml += `<div class="ev"><div class="dot">${ic}</div><div class="txt"><b>${esc(t.title)}</b> \u2014 ${esc(t.zone)}`
      + `<br><span class="src">${esc(meta)}</span><br><a class="maplink" href="${esc(t.url || "#")}">Event details \u2192</a></div></div>`;
  }

  const topImg = topPhoto ? `<img class="hero" src="${esc(topPhoto)}" alt="">` : "";
  const spotImg = spotPhoto ? `<img class="hero" src="${esc(spotPhoto)}" alt="">` : "";
  const topCta = top ? `<a class="cta" href="${esc(topLink)}">${topIsBiz ? "Visit " + esc(top.title) + " \u2192" : "Event details \u2192"}</a>` : "";

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(issueTitle)}</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Libre+Franklin:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--blue:#0021A5;--orange:#FA4616;--cream:#FBF6EC;--ink:#1c1c1c;--muted:#5a5a5a;--line:#e7e0d0;}
*{box-sizing:border-box;} body{margin:0;background:#d9d4c7;font-family:'Libre Franklin',system-ui,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased;padding:24px 12px;}
.email{max-width:600px;margin:0 auto;background:var(--cream);border-radius:14px;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.16);}
.masthead{background:var(--blue);color:#fff;padding:30px 34px 26px;border-bottom:5px solid var(--orange);}
.masthead .kicker{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#b9c4f2;font-weight:600;margin:0 0 8px;}
.masthead h1{font-family:'Fraunces',Georgia,serif;font-weight:700;font-size:42px;line-height:.98;margin:0;letter-spacing:-.5px;}
.masthead h1 .num{color:var(--orange);} .masthead .tagline{margin:10px 0 0;font-size:14px;color:#cfd7f5;font-style:italic;font-family:'Fraunces',Georgia,serif;}
.issuebar{display:flex;justify-content:space-between;align-items:center;background:#001a85;color:#aeb9ee;padding:9px 34px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;font-weight:600;}
.body{padding:6px 34px 4px;} section{padding:24px 0;border-bottom:1px solid var(--line);} section:last-of-type{border-bottom:none;}
.eyebrow{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--orange);margin:0 0 10px;}
h2{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:25px;line-height:1.12;margin:0 0 12px;color:var(--blue);letter-spacing:-.3px;}
.welcome h2{font-size:30px;} p{font-size:16px;line-height:1.62;margin:0 0 14px;color:#262626;} p:last-child{margin-bottom:0;}
.lead{font-size:17px;} strong{color:var(--ink);} .hero{width:100%;height:auto;border-radius:10px;margin:4px 0 14px;display:block;}
.mission{background:#fff;border-left:4px solid var(--orange);padding:15px 18px;border-radius:0 8px 8px 0;margin:16px 0;font-size:16px;line-height:1.55;}
.rating{color:var(--orange);font-weight:700;white-space:nowrap;}
.fav{margin:0 0 16px;padding:0 0 16px;border-bottom:1px dashed var(--line);} .fav:last-child{border-bottom:none;padding-bottom:0;margin-bottom:0;}
.fav .name{font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:18px;color:var(--blue);}
.fav .where{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:600;} .fav p{font-size:15px;margin:6px 0 0;}
.ev{display:flex;gap:13px;padding:12px 0;border-bottom:1px dashed var(--line);} .ev:last-child{border-bottom:none;}
.ev .dot{flex:0 0 auto;width:34px;height:34px;border-radius:9px;background:#fff;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:18px;}
.ev .txt{font-size:15px;line-height:1.5;} .ev .txt b{color:var(--blue);} .ev .src{color:var(--muted);font-size:12.5px;font-style:italic;}
.maplink{color:var(--blue);font-weight:600;text-decoration:none;}
.cta{display:inline-block;background:var(--orange);color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:9px;margin-top:6px;}
.addr{font-size:13px;color:var(--muted);margin-top:8px;}
.footer{background:var(--blue);color:#cfd7f5;padding:28px 34px 30px;text-align:center;}
.footer .sign{font-family:'Fraunces',Georgia,serif;color:#fff;font-size:20px;font-weight:600;margin:0 0 4px;}
.footer .roles{font-size:12px;color:#a9b4e6;letter-spacing:.04em;margin:0 0 16px;} .footer .small{font-size:12px;color:#8e9bd6;line-height:1.6;margin:0;}
.footer a{color:#cfd7f5;}
</style></head><body>
<div class="email">
  <div class="masthead">
    <p class="kicker">Leesburg \u00b7 Mount Dora \u00b7 Eustis \u00b7 Tavares \u00b7 The Villages \u00b7 Ocala</p>
    <h1>The <span class="num">352</span> Beat</h1>
    <p class="tagline">The Pulse of Lake County Life</p>
  </div>
  <div class="issuebar"><span>Issue #1 \u00b7 Welcome Edition</span><span>Free Weekly</span></div>
  <div class="body">
    <section class="welcome">
      <h2>Welcome to The 352 Beat \uD83D\uDC4B</h2>
      <p class="lead">If you live in the 352 \u2014 from Leesburg and the Harris Chain of Lakes to Mount Dora's brick streets, the squares of The Villages, and the horse farms around Ocala \u2014 this one's for you.</p>
      <p>The 352 Beat is a free weekly email about the place we actually live: the family-run spots worth the drive, the events worth leaving the house for, and the little discoveries that make this corner of Central Florida feel like home.</p>
      <div class="mission"><strong>Our promise:</strong> kept local, kept positive, and always worth your five minutes.</div>
    </section>
    <section>
      <span class="eyebrow">\u2B50 Top Story</span>
      <h2>${top ? esc(top.title) : "This Week in the 352"}</h2>
      ${topImg}
      <p>${esc(topStory)}</p>
      ${topCta}
    </section>
    <section>
      <span class="eyebrow">\uD83C\uDF74 Business Spotlight</span>
      <h2>${esc(spot.title)}</h2>
      ${spotImg}
      <p>${esc(spotStory)}</p>
      <a class="cta" href="${esc(bizLink(spot))}">Visit ${esc(spot.title)} \u2192</a>
      <p class="addr">${esc(spot.location || "")}</p>
    </section>
    <section>
      <span class="eyebrow">\uD83D\uDCCD On Our Radar</span>
      <h2>More 352 Favorites Worth Knowing</h2>
      ${radarHtml}
    </section>
    <section>
      <span class="eyebrow">\uD83C\uDF89 Things To Do</span>
      <h2>Around the 352 This Week</h2>
      <p>A few local ways to get out \u2014 confirm times on the event page before you head out:</p>
      ${thingsHtml}
      <p style="margin-top:14px;">Hosting something? <strong>Reply and tell us</strong> \u2014 we'll help spread the word.</p>
    </section>
    <section>
      <span class="eyebrow">\uD83D\uDDE3\uFE0F Reader Corner</span>
      <h2>Help Us Shape The 352 Beat</h2>
      <p>We're brand new, and building this for you. <strong>What's one local thing you wish more people knew about?</strong> A business, an event, a hidden gem \u2014 just hit reply, a real person reads every note.</p>
      <a class="cta" href="https://the352beat.com/tip">Share a Tip \u2192</a>
    </section>
  </div>
  <div class="footer">
    <p class="sign">See you next week</p>
    <p class="small" style="margin-bottom:16px;">Thanks for being one of our very first readers \u2014 it means a lot.</p>
    <p class="sign" style="font-size:17px;">\u2014 Robert, Taylor, Abby &amp; Lynn</p>
    <p class="roles">Robert \u00b7 Editor &nbsp;|&nbsp; Taylor, Abby &amp; Lynn \u00b7 Writers</p>
    <p class="small">The 352 Beat \u00b7 The Pulse of Lake County Life<br>You're receiving this because you signed up at the352beat.com.</p>
  </div>
</div></body></html>`;

  return { title: issueTitle, html, leadZone: spotZ, zonesFeatured, topTitle: top?.title ?? "", spotTitle: spot.title };
}
