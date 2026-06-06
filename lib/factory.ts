// Orchestration: discover local stories, then have LETTERMAN WRITE each one (grounded,
// no invented facts) and assemble a populated, email-ready Letterman draft filed under
// the publication. SERVER ONLY.

import lm from "@/lib/letterman";
import { upsertApproval } from "@/lib/approval";
import { discover, type DiscoveredItem } from "@/lib/discovery";
import { getPublication } from "@/config/publications";

function issueLabel(): string {
  return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// Strict grounding prompt: Letterman may use ONLY the headline + snippet, never invent.
function groundPrompt(it: DiscoveredItem): string {
  return [
    "Write a 2-3 sentence item for a local community newsletter for adults 50+ in North Central Florida.",
    "Use ONLY the headline and snippet below. Do NOT invent any facts, names, dates, numbers, quotes, prices, or details that are not present. Neutral, useful tone. No headline, no link, just the prose.",
    `HEADLINE: ${it.title}`,
    `SNIPPET: ${it.description || "(none provided)"}`,
  ].join("\n");
}

async function writeItem(it: DiscoveredItem): Promise<string> {
  try {
    const r = (await lm.ai.generate({ prompt: groundPrompt(it) })) as Record<string, unknown>;
    const out = String(r.promptOutPut ?? "").trim();
    if (out) return out;
  } catch { /* fall through to headline */ }
  return it.title; // grounded fallback: the publisher's own headline
}

export interface BuildResult {
  ok: boolean;
  publication: string;
  newsletterId?: string;
  newsletterName?: string;
  totalStories: number;
  written: number;
  sections: Array<{ pillar: string; label: string; count: number }>;
  notes: string[];
  error?: string;
}

export async function buildDraft(publicationId: string): Promise<BuildResult> {
  const pub = getPublication(publicationId);
  if (!pub) return { ok: false, publication: publicationId, totalStories: 0, written: 0, sections: [], notes: [], error: "Unknown publication" };

  const notes: string[] = [];
  const result = await discover(pub);
  if (result.total === 0) {
    return { ok: false, publication: pub.name, totalStories: 0, written: 0, sections: [], notes, error: "No qualifying local stories found this run." };
  }

  const name = `${pub.lettermanName} - ${issueLabel()}`;
  let newsletterId = "";
  try {
    const nl = (await lm.newsletters.create({ name })) as Record<string, unknown>;
    newsletterId = String(nl._id ?? nl.id ?? "");
    if (!newsletterId) throw new Error("Letterman did not return a newsletter id");
  } catch (e) {
    return { ok: false, publication: pub.name, totalStories: result.total, written: 0, sections: [], notes, error: `Letterman create failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  // File under the publication so it shows in the dashboard.
  if (pub.lettermanStorageId) {
    try { await lm.newsletters.update(newsletterId, { storageId: pub.lettermanStorageId }); }
    catch (e) { notes.push(`Publication attach failed: ${e instanceof Error ? e.message : String(e)}`); }
  }

  // Remove the empty default CUSTOM_COMBO block Letterman auto-adds.
  try {
    const secs = (await lm.newsletters.sections(newsletterId)) as Array<Record<string, unknown>>;
    for (const s of secs) {
      if (String(s.type) === "CUSTOM_COMBO") await lm.newsletters.removeSection(newsletterId, String(s._id));
    }
  } catch { /* non-fatal */ }

  let written = 0;
  const sections: BuildResult["sections"] = [];
  for (const pillar of pub.pillars) {
    const items = (result.byPillar[pillar.key] ?? []).slice(0, 3); // bound generation time
    if (!items.length) continue;
    try {
      await lm.newsletters.addSection(newsletterId, { type: "TITLE", title: pillar.label, showTitle: true });
      for (const it of items) {
        const prose = await writeItem(it);
        if (prose !== it.title) written++;
        const body = `${prose}<br><br><a href="${it.link}">Read more${it.source ? ` \u2014 ${it.source}` : ""}</a>`;
        await lm.newsletters.addSection(newsletterId, { type: "TEXT", promptOutPut: body });
      }
      sections.push({ pillar: pillar.key, label: pillar.label, count: items.length });
    } catch (e) {
      notes.push(`Section "${pillar.label}" failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  try { upsertApproval(newsletterId, { newsletterTitle: name }); } catch { /* best-effort */ }

  return { ok: true, publication: pub.name, newsletterId, newsletterName: name, totalStories: result.total, written, sections, notes };
}
