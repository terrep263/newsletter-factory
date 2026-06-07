/**
 * CivicPlus iCal event source — The 352 Beat.
 * Fetches per-category iCal feeds from a CivicPlus municipal calendar, parses
 * VEVENTs, keeps only upcoming events within a horizon, dedupes recurring
 * instances, caps per town, and tags the town zone. No API key required.
 */
import type { NormalizedItem } from "@/lib/collector";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface IcalOpts {
  domain: string;       // e.g. "www.clermontfl.gov"
  catIDs: number[];     // CivicPlus calendar category ids
  zone: string;         // town name
  weeksAhead?: number;  // horizon (default 8)
  cap?: number;         // max events returned (default 40)
}

function unfold(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function unescape(s?: string): string {
  return (s || "")
    .replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\")
    .replace(/\s+/g, " ").trim();
}

function icalDate(v?: string): string | null {
  if (!v) return null;
  const m = v.match(/(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function icalTime(v?: string): string | null {
  if (!v) return null;
  const m = v.match(/T(\d{2})(\d{2})/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ap}`;
}

function parseVevents(ics: string): Array<Record<string, string>> {
  const out: Array<Record<string, string>> = [];
  const blocks = ics.split("BEGIN:VEVENT").slice(1);
  for (const blk of blocks) {
    const body = blk.split("END:VEVENT")[0];
    const ev: Record<string, string> = {};
    for (const line of body.split(/\r?\n/)) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const key = line.slice(0, idx).split(";")[0].toUpperCase();
      const val = line.slice(idx + 1);
      if (!(key in ev)) ev[key] = val;
    }
    out.push(ev);
  }
  return out;
}

export async function fetchIcalEvents(opts: IcalOpts): Promise<NormalizedItem[]> {
  const weeksAhead = opts.weeksAhead ?? 8;
  const cap = opts.cap ?? 40;
  const todayStr = new Date().toISOString().slice(0, 10);
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + weeksAhead * 7);
  const horizonStr = horizon.toISOString().slice(0, 10);

  const seen = new Set<string>();
  const out: NormalizedItem[] = [];

  for (const cid of opts.catIDs) {
    const url = `https://${opts.domain}/common/modules/iCalendar/iCalendar.aspx?catID=${cid}&feed=calendar`;
    let ics: string;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/calendar,*/*" }, cache: "no-store" });
      if (!res.ok) continue;
      ics = unfold(await res.text());
    } catch { continue; }

    for (const ev of parseVevents(ics)) {
      const title = unescape(ev["SUMMARY"]);
      const date = icalDate(ev["DTSTART"]);
      if (!title || !date) continue;
      if (date < todayStr || date > horizonStr) continue;
      const uid = ev["UID"] || title;
      const key = `${uid}|${date}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let link: string | null = null;
      const desc = ev["DESCRIPTION"] || "";
      const m = desc.match(/https?:\/\/[^\s\\]*EID=\d+/i);
      if (m) link = m[0];
      else if (/^\d+$/.test(uid)) link = `https://${opts.domain}/Calendar.aspx?EID=${uid}`;

      out.push({
        item_type: "event",
        title,
        body: null,
        url: link,
        image_url: null,
        zone: opts.zone,
        event_date: date,
        location: unescape(ev["LOCATION"]) || opts.zone,
        raw: { eventTime: icalTime(ev["DTSTART"]), uid, catID: cid },
      });
    }
  }

  out.sort((a, b) => (a.event_date || "").localeCompare(b.event_date || ""));
  return out.slice(0, cap);
}
