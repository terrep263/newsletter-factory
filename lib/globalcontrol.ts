/**
 * Global Control API client — Newsletter Factory
 * ------------------------------------------------------------------
 * Server-side ONLY. Holds the API key; never import into the browser.
 *
 * Base:   https://api.globalcontrol.io/api/ai
 * Auth:   X-API-KEY header
 * Wrapper: success -> { type:"response", data:{...} }
 *          error   -> { type:"error", error:{...} }
 *
 * AUTH: set GLOBALCONTROL_API_KEY in the environment (Coolify env var).
 * Rotating the key = change one env value, no code edits.
 *
 * What this unlocks for the factory: engagement-aware sending.
 * Read contact segments (active/dead/etc.) and smart lists, and fire
 * tags that trigger Global Control workflows.
 */

const BASE_URL =
  process.env.GLOBALCONTROL_BASE_URL ?? "https://api.globalcontrol.io/api/ai";
const KEY = process.env.GLOBALCONTROL_API_KEY ?? "";

type Json = Record<string, unknown>;
type Method = "GET" | "POST" | "PUT" | "DELETE";
type Query = Record<string, string | number | boolean | undefined>;

class GlobalControlError extends Error {
  constructor(public status: number, public path: string, public body: unknown) {
    super(`GlobalControl ${status} on ${path}`);
    this.name = "GlobalControlError";
  }
}

function qs(query?: Query): string {
  if (!query) return "";
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

async function call<T = unknown>(
  method: Method,
  path: string,
  opts: { body?: Json; query?: Query } = {},
): Promise<T> {
  if (!KEY) throw new Error("GLOBALCONTROL_API_KEY is not set");
  const res = await fetch(`${BASE_URL}${path}${qs(opts.query)}`, {
    method,
    headers: {
      "X-API-KEY": KEY,
      Accept: "application/json",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
    cache: "no-store",
  });

  const text = await res.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* leave as text */ }

  const isErr =
    parsed && typeof parsed === "object" && (parsed as Json).type === "error";
  if (!res.ok || isErr) throw new GlobalControlError(res.status, path, parsed);

  // unwrap the { type:"response", data } envelope
  if (parsed && typeof parsed === "object" && "data" in (parsed as Json)) {
    return (parsed as Json).data as T;
  }
  return parsed as T;
}

/* ---------------------------------------------------------------- *
 *  Account
 * ---------------------------------------------------------------- */
export const account = {
  me: () => call("GET", "/users/me"),
};

/* ---------------------------------------------------------------- *
 *  Contacts  (engagement segments are the valuable part)
 * ---------------------------------------------------------------- */
export type Activity =
  | "new" | "inactive" | "passive" | "active"
  | "active_open" | "active_click" | "dead" | "undeliverable";

export interface ContactQuery extends Query {
  page?: number;
  limit?: number;     // -1 for all
  tags?: string;      // tag id filter
  activity?: Activity;
  search?: string;
  phone?: string;     // "1" to require a phone
  sort?: string;
}

export const contacts = {
  list: (q?: ContactQuery) => call<Json>("GET", "/contacts", { query: q }),
  // pre-segmented shortcuts
  activeOpen: (q?: ContactQuery) => call<Json>("GET", "/contacts/active-open", { query: q }),
  activeClick: (q?: ContactQuery) => call<Json>("GET", "/contacts/active-click", { query: q }),
  inactive: (q?: ContactQuery) => call<Json>("GET", "/contacts/inactive", { query: q }),
  passive: (q?: ContactQuery) => call<Json>("GET", "/contacts/passive", { query: q }),
  new: (q?: ContactQuery) => call<Json>("GET", "/contacts/new", { query: q }),
  dead: (q?: ContactQuery) => call<Json>("GET", "/contacts/dead", { query: q }),
  undeliverable: (q?: ContactQuery) => call<Json>("GET", "/contacts/undeliverable", { query: q }),

  get: (id: string) => call<Json>("GET", `/contacts/${id}`),
  details: (id: string, pipelineId?: string) =>
    call<Json>("GET", `/contacts/${id}/details`, { query: { pipelineId } }),
  create: (c: { email: string; firstName?: string; lastName?: string; phone?: string; tagId?: string }) =>
    call<Json>("POST", "/contacts", { body: c }),
  update: (id: string, patch: Json) => call<Json>("PUT", `/contacts/${id}`, { body: patch }),
  remove: (id: string) => call<Json>("DELETE", `/contacts/${id}`),
};

/* ---------------------------------------------------------------- *
 *  Tags  (fire-tag is the automation trigger)
 * ---------------------------------------------------------------- */
export const tags = {
  list: () => call<Json[]>("GET", "/tags"),
  get: (id: string) => call<Json>("GET", `/tags/${id}`),
  create: (t: { name: string; groupId: string; description?: string; isHot?: boolean }) =>
    call<Json>("POST", "/tags", { body: t }),
  update: (id: string, patch: Json) => call<Json>("PUT", `/tags/${id}`, { body: patch }),
  remove: (id: string) => call<Json>("DELETE", `/tags/${id}`),

  withContactStatus: () => call<Json[]>("GET", "/tags/list-with-contact-status"),
  contacts: (id: string) => call<Json>("GET", `/tags/${id}/contacts`),

  /** Fire a tag for a contact — creates if missing, triggers workflows. */
  fire: (tagId: string, contact: { email: string; firstName?: string; lastName?: string; phone?: string; ignoreTagFire?: boolean }) =>
    call<Json>("POST", `/tags/fire-tag/${tagId}`, { body: contact }),
  fireMany: (payload: { email: string; tagIds: string[]; firstName?: string; lastName?: string; phone?: string; ignoreTagFire?: boolean }) =>
    call<Json>("POST", "/tags/fire-tags", { body: payload }),
};

/* ---------------------------------------------------------------- *
 *  Tag groups & labels
 * ---------------------------------------------------------------- */
export const tagGroups = {
  list: () => call<Json[]>("GET", "/tag-groups"),
  get: (id: string) => call<Json>("GET", `/tag-groups/${id}`),
  create: (name: string) => call<Json>("POST", "/tag-groups", { body: { name } }),
  update: (id: string, name: string) => call<Json>("PUT", `/tag-groups/${id}`, { body: { name } }),
  remove: (id: string) => call<Json>("DELETE", `/tag-groups/${id}`),
};

export const tagLabels = {
  list: () => call<Json[]>("GET", "/tags-labels"),
  get: (id: string) => call<Json>("GET", `/tags-labels/${id}`),
  create: (l: { name: string; color: string }) => call<Json>("POST", "/tags-labels", { body: l }),
  update: (id: string, patch: Json) => call<Json>("PUT", `/tags-labels/${id}`, { body: patch }),
  remove: (id: string) => call<Json>("DELETE", `/tags-labels/${id}`),
  /** 8-metric engagement breakdown; use "all" for every tag. */
  stats: (id: string, groupId?: string) =>
    call<Json>("GET", `/tags-labels/${id}/stats`, { query: { groupId } }),
};

/* ---------------------------------------------------------------- *
 *  Smart Lists  (saved segments with include/exclude tag logic)
 * ---------------------------------------------------------------- */
export const smartListGroups = {
  list: () => call<Json[]>("GET", "/smart-list-groups"),
  get: (id: string) => call<Json>("GET", `/smart-list-groups/${id}`),
  create: (name: string) => call<Json>("POST", "/smart-list-groups", { body: { name } }),
  update: (id: string, name: string) => call<Json>("PUT", `/smart-list-groups/${id}`, { body: { name } }),
  remove: (id: string) => call<Json>("DELETE", `/smart-list-groups/${id}`),
};

export interface SmartListInput {
  name: string;
  description?: string;
  groupId?: string;
  groups?: string[];        // included tag-group ids
  tags?: string[];          // included tag ids
  excludeGroups?: string[];
  excludeTags?: string[];
}

export const smartLists = {
  list: (groupId?: string) => call<Json[]>("GET", "/smart-lists", { query: { groupId } }),
  get: (id: string) => call<Json>("GET", `/smart-lists/${id}`),
  create: (s: SmartListInput) => call<Json>("POST", "/smart-lists", { body: s as unknown as Json }),
  update: (id: string, s: Partial<SmartListInput>) => call<Json>("PUT", `/smart-lists/${id}`, { body: s as unknown as Json }),
  remove: (id: string) => call<Json>("DELETE", `/smart-lists/${id}`),
  contacts: (id: string, q?: ContactQuery) => call<Json>("GET", `/smart-lists/${id}/contacts`, { query: q }),
  count: (smartListId: string) => call<Json>("POST", "/smart-lists/contact-count", { body: { smartListId } }),
};

/* ---------------------------------------------------------------- *
 *  Integrations & sub-users (read)
 * ---------------------------------------------------------------- */
export const integrations = {
  list: () => call<Json[]>("GET", "/integrations"),
  connected: (q?: Query) => call<Json[]>("GET", "/integrations/connected", { query: q }),
  connectedCategories: () => call<Json[]>("GET", "/integrations/connected-categories"),
};

export const subUsers = {
  list: (includeParent?: boolean) => call<Json[]>("GET", "/sub-users", { query: { includeParent } }),
  get: (id: string) => call<Json>("GET", `/sub-users/${id}`),
};

export { GlobalControlError };
export default {
  account, contacts, tags, tagGroups, tagLabels,
  smartListGroups, smartLists, integrations, subUsers,
};
