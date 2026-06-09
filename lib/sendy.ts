/**
 * Sendy API client — server-side ONLY (holds the API key).
 * Base: SENDY_BASE_URL (the Sendy install). AUTH: SENDY_API_KEY.
 */
const BASE = (process.env.SENDY_BASE_URL ?? "https://mail.thenewsletterfactory.com").replace(/\/$/, "");
const API_KEY = process.env.SENDY_API_KEY ?? "";

export interface SendyResult { ok: boolean; already: boolean; status: number; body: string; }

/** Subscribe (also updates) a contact to a Sendy list. Sendy returns "1"/"true" on success. */
export async function subscribe(listId: string, email: string, name?: string): Promise<SendyResult> {
  const form = new URLSearchParams();
  form.set("api_key", API_KEY);
  form.set("list", listId);
  form.set("email", email);
  if (name) form.set("name", name);
  form.set("boolean", "true");

  const res = await fetch(`${BASE}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store",
  });
  const body = (await res.text()).trim();
  const lower = body.toLowerCase();
  const ok = body === "1" || lower === "true";
  const already = /already subscribed/i.test(body);
  return { ok: ok || already, already, status: res.status, body };
}

export interface CampaignInput {
  title: string;
  subject: string;
  html: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  brandId?: string;          // REQUIRED by Sendy create.php for every campaign
  listIds?: string;          // comma-separated; required to actually send
  send?: boolean;            // true => send_campaign=1 (live send)
  plainText?: string;
  scheduleDateTime?: string; // e.g. "2026-06-15 09:00"
  scheduleTimezone?: string; // e.g. "America/New_York"
}

export interface CampaignResult { ok: boolean; status: number; body: string; }

/** Create (and optionally send/schedule) a campaign via Sendy's create.php. */
export async function createCampaign(c: CampaignInput): Promise<CampaignResult> {
  const form = new URLSearchParams();
  form.set("api_key", API_KEY);
  form.set("from_name", c.fromName);
  form.set("from_email", c.fromEmail);
  form.set("reply_to", c.replyTo || c.fromEmail);
  form.set("title", c.title);
  form.set("subject", c.subject);
  form.set("html_text", c.html);
  if (c.plainText) form.set("plain_text", c.plainText);
  if (c.brandId) form.set("brand_id", c.brandId);   // Sendy requires brand_id on every create
  if (c.listIds) form.set("list_ids", c.listIds);
  form.set("track_opens", "1");
  form.set("track_clicks", "1");
  form.set("send_campaign", c.send ? "1" : "0");
  if (c.scheduleDateTime) {
    form.set("schedule_date_time", c.scheduleDateTime);
    if (c.scheduleTimezone) form.set("schedule_timezone", c.scheduleTimezone);
  }

  const res = await fetch(`${BASE}/api/campaigns/create.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store",
  });
  const body = (await res.text()).trim();
  const ok = /campaign (created|scheduled)|now sending/i.test(body);
  return { ok, status: res.status, body };
}

export const sendyConfig = () => ({ base: BASE, hasApiKey: Boolean(API_KEY) });

export default { subscribe, createCampaign, sendyConfig };
