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
  form.set("boolean", "true"); // plain-text "1"/"true" response instead of HTML

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

export const sendyConfig = () => ({ base: BASE, hasApiKey: Boolean(API_KEY) });

export default { subscribe, sendyConfig };
