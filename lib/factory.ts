// Orchestration: run discovery for a publication, then assemble a populated Letterman draft.
// Content is built ONLY from retrieved facts (headline, source, link) - nothing invented.
// Each pillar -> a TITLE block + a TEXT block whose body (promptOutPut) lists the real,
// linked, local stories. SERVER ONLY.

import lm from "@/lib/letterman";
import { upsertApproval } from "@/lib/approval";
import { discover, type DiscoveredItem } from "@/lib/discovery";
import { getPublication } from "@/config/publications";

function issueLabel(): string {
  return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function sectionBody(items: DiscoveredItem[]): string {
  return items
    .map((it) => `${it.title}${it.source ? ` (${it.source})` : ""}\n${it.link}`)
    .join("\n\n");
}

export interface BuildResult {
  ok: boolean;
  publication: string;
  newsletterId?: string;
  newsletterName?: string;
  totalStories: number;
  sections: Array<{ pillar: string; label: string; count: number }>;
  referenceLinksAttached: number;
  notes: string[];
  error?: string;
}

export async function buildDraft(publicationId: string): Promise<BuildResult> {
  const pub = getPublication(publicationId);
  if (!pub) return { ok: false, publication: publicationId, totalStories: 0, sections: [], referenceLinksAttached: 0, notes: [], error: "Unknown publication" };

  const notes: string[] = [];
  const result = await discover(pub);
  if (result.total === 0) {
    return { ok: false, publication: pub.name, totalStories: 0, sections: [], referenceLinksAttached: 0, notes, error: "No qualifying local stories found this run." };
  }

  const name = `${pub.lettermanName} - ${issueLabel()}`;
  let newsletterId = "";
  try {
    const nl = (await lm.newsletters.create({ name })) as Record<string, unknown>;
    newsletterId = String(nl._id ?? nl.id ?? "");
    if (!newsletterId) throw new Error("Letterman did not return a newsletter id");
  } catch (e) {
    return { ok: false, publication: pub.name, totalStories: result.total, sections: [], referenceLinksAttached: 0, notes, error: `Letterman create failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  // File the draft under the publication's Letterman storage so it appears in the
  // letterman.ai dashboard (passing storageId at create time fails Letterman validation,
  // so it must be attached immediately after).
  if (pub.lettermanStorageId) {
    try {
      await lm.newsletters.update(newsletterId, { storageId: pub.lettermanStorageId });
      notes.push(`Filed under the ${pub.name} publication.`);
    } catch (e) {
      notes.push(`Could not attach to publication storage: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const sections: BuildResult["sections"] = [];
  for (const pillar of pub.pillars) {
    const items = result.byPillar[pillar.key] ?? [];
    if (!items.length) continue;
    try {
      await lm.newsletters.addSection(newsletterId, { type: "TITLE", title: pillar.label, showTitle: true });
      await lm.newsletters.addSection(newsletterId, { type: "TEXT", promptOutPut: sectionBody(items) });
      sections.push({ pillar: pillar.key, label: pillar.label, count: items.length });
    } catch (e) {
      notes.push(`Section "${pillar.label}" failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Reference links are best-effort (Letterman validation is strict); the grounded
  // TEXT sections above are the guaranteed content, so a failure here is non-fatal.
  let refCount = 0;
  for (const it of result.all) {
    try {
      await lm.newsletters.addReferenceLinks(newsletterId, { url: it.link });
      refCount++;
    } catch { /* ignore - sections already carry the sourced content */ }
  }
  if (refCount) notes.push(`${refCount} reference links attached for optional Letterman expansion.`);

  try {
    upsertApproval(newsletterId, { newsletterTitle: name });
  } catch { /* approval registry is best-effort */ }

  return { ok: true, publication: pub.name, newsletterId, newsletterName: name, totalStories: result.total, sections, referenceLinksAttached: refCount, notes };
}
