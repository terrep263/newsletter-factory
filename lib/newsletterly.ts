/**
 * Newsletterly API client — server-side only. Reads NEWSLETTERLY_API_KEY from env.
 * Base: https://thenewsletterly.com/api/v1  |  Auth: Bearer nl_live_...
 * The app calls Newsletterly; never the other way around.
 */
const BASE = process.env.NEWSLETTERLY_BASE_URL ?? "https://thenewsletterly.com/api/v1";
const KEY = process.env.NEWSLETTERLY_API_KEY ?? "";
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

type Json = Record<string, unknown>;

async function call(method: string, path: string, body?: Json): Promise<{ status: number; data: unknown }> {
  if (!KEY) throw new Error("NEWSLETTERLY_API_KEY is not set");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
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

export const newsletterly = {
  ping: () => call("GET", "/"),
  listNewsletters: () => call("GET", "/newsletters?page=1"),
  createNewsletter: (title: string, content: string) =>
    call("POST", "/newsletters", { title, content }),
  send: (id: number | string, subject: string, testEmail?: string) =>
    call("POST", `/newsletters/${id}/send`, testEmail ? { subject, test_email: testEmail } : { subject }),
};

export default newsletterly;
