/**
 * Letterman API Client  —  Newsletter Factory foundation
 * ------------------------------------------------------------------
 * Server-side ONLY. Never import this into a client/browser component;
 * it holds the API token. In Next.js use it from route handlers,
 * server actions, or server components.
 *
 * Endpoints below were confirmed live against app.letterman.ai's own
 * frontend bundle + direct calls. Base: https://api.letterman.ai/api
 *
 * AUTH: set LETTERMAN_TOKEN in your environment (.env.local on dev,
 * Coolify env var in prod). Rotating the token = change one env value,
 * zero code edits. Prefer a token from POST /user/regenerate-api-access-token.
 */

const BASE_URL = process.env.LETTERMAN_BASE_URL ?? "https://api.letterman.ai/api";
const TOKEN = process.env.LETTERMAN_TOKEN ?? "";

type Json = Record<string, unknown>;
type Method = "GET" | "POST" | "PUT" | "DELETE";

class LettermanError extends Error {
  constructor(public status: number, public path: string, public body: unknown) {
    super(`Letterman ${status} on ${path}`);
    this.name = "LettermanError";
  }
}

async function call<T = unknown>(
  method: Method,
  path: string,
  body?: Json,
): Promise<T> {
  if (!TOKEN) throw new Error("LETTERMAN_TOKEN is not set");
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    // never cache writes; reads can be tuned per-call by the caller
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = text;
  try { data = JSON.parse(text); } catch { /* leave as text */ }

  // Letterman sometimes returns 200 with an { type:"error" } envelope
  const errEnvelope =
    data && typeof data === "object" && (data as Json).type === "error";
  if (!res.ok || errEnvelope) throw new LettermanError(res.status, path, data);

  return data as T;
}

/* ---------------------------------------------------------------- *
 *  Account
 * ---------------------------------------------------------------- */
export const account = {
  me: () => call("GET", "/user"),
  /** Mint a fresh official API token (recommended over the editor JWT). */
  regenerateApiToken: () => call("POST", "/user/regenerate-api-access-token"),
};

/* ---------------------------------------------------------------- *
 *  Newsletters (the issue / metadata layer)
 * ---------------------------------------------------------------- */
export interface NewsletterCreate {
  name: string;
  type?: "NEWSLETTER";          // confirmed required pair: name + type
  term?: string;                // seed term for AI generation (Path A)
  [k: string]: unknown;
}

export const newsletters = {
  list: () => call<Json[]>("GET", "/newsletters"),
  get: (id: string) => call<Json>("GET", `/newsletters/${id}`),
  create: (n: NewsletterCreate) =>
    call<Json>("POST", "/newsletters", { type: "NEWSLETTER", ...n }),
  /** NOTE: Letterman supports PUT only (PATCH is 404). */
  update: (id: string, patch: Json) =>
    call<Json>("PUT", `/newsletters/${id}`, patch),
  remove: (id: string) => call("DELETE", `/newsletters/${id}`),

  // content sections (the body / block model)
  addSection: (newsletterId: string, section: Json) =>
    call<Json>("POST", `/newsletters/${newsletterId}/sections`, section),
  removeSection: (newsletterId: string, sectionId: string) =>
    call("DELETE", `/newsletters/${newsletterId}/sections/${sectionId}`),

  // reference links → AI drafting
  addReferenceLinks: (newsletterId: string, links: Json) =>
    call<Json>("POST", `/newsletters/${newsletterId}/reference-links`, links),
  generateFromReferences: (newsletterId: string) =>
    call<Json>("POST", `/newsletters/${newsletterId}/reference-links/generate-prompt-output`),
  suggestKeywords: (payload: Json) =>
    call<Json>("POST", "/newsletters/get-suggested-article-keywords", payload),

  // sending
  sendTestEmail: (id: string, payload: Json) =>
    call("POST", `/newsletters/send-test-email/${id}`, payload),
  sendEmail: (id: string, payload: Json) =>
    call("POST", `/newsletters/send-email/${id}`, payload),
};

/* ---------------------------------------------------------------- *
 *  Newsletter storage (publication / sending config layer)
 * ---------------------------------------------------------------- */
export const storage = {
  get: (storageId: string) =>
    call<Json>("GET", `/newsletters-storage/${storageId}`),
  /** Public read — no auth needed; handy for verification/archives. */
  getPublic: (storageId: string) =>
    fetch(`${BASE_URL}/get-public-storage/${storageId}`).then((r) => r.json()),
  create: (payload: Json) => call<Json>("POST", "/newsletters-storage", payload),
  sendTestEmail: (storageId: string, payload: Json) =>
    call("POST", `/newsletters-storage/send-test-email/${storageId}`, payload),
};

/* ---------------------------------------------------------------- *
 *  RSS feeds  —  the factory's cleanest content pipe
 *  (point Letterman at a feed your 352 collector emits)
 * ---------------------------------------------------------------- */
export const rss = {
  create: (feed: { url: string; [k: string]: unknown }) =>
    call<Json>("POST", "/rss-feeds", feed),
  refresh: (feedId: string) =>
    call("POST", `/rss-feeds/${feedId}/refresh`),
  remove: (feedId: string) => call("DELETE", `/rss-feeds/${feedId}`),
};

/* ---------------------------------------------------------------- *
 *  AI generation (prompt-output)
 * ---------------------------------------------------------------- */
export const ai = {
  generate: (payload: Json) => call<Json>("POST", "/prompt-output/generate/", payload),
  generateFor: (id: string, payload: Json) =>
    call<Json>("POST", `/prompt-output/generate/${id}`, payload),
  regenerate: (id: string, payload: Json) =>
    call<Json>("POST", `/prompt-output/re-generate/${id}`, payload),
};

/* ---------------------------------------------------------------- *
 *  Campaigns / Subscribers / Templates
 * ---------------------------------------------------------------- */
export const campaigns = {
  list: () => call<Json[]>("GET", "/campaigns"),
  get: (id: string) => call<Json>("GET", `/campaigns/${id}`),
  create: (payload: Json) => call<Json>("POST", "/campaigns", payload),
  update: (id: string, payload: Json) => call<Json>("PUT", `/campaigns/${id}`, payload),
  remove: (id: string) => call("DELETE", `/campaigns/${id}`),
};

export const subscribers = {
  list: () => call<Json[]>("GET", "/subscribers"),
  create: (payload: Json) => call<Json>("POST", "/subscribers", payload),
  remove: (id: string) => call("DELETE", `/subscribers/${id}`),
};

export const templates = {
  list: () => call<Json[]>("GET", "/templates"),
  create: (payload: Json) => call<Json>("POST", "/templates", payload),
};

export const monetization = {
  list: () => call<Json[]>("GET", "/monetization"),
  categories: () => call<Json[]>("GET", "/monetization-categories"),
};

export { LettermanError };
export default {
  account, newsletters, storage, rss, ai, campaigns, subscribers, templates, monetization,
};
