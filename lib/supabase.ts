/**
 * Supabase server client — Newsletter Factory
 * SERVER ONLY. Uses the service-role key, scoped to the `factory` schema.
 * Never import into a client component.
 *
 * Lazy initialization: the client is created on first use, not at module
 * load. This keeps `next build` from needing runtime secrets.
 */
import { createClient } from "@supabase/supabase-js";

type AnyClient = any; // eslint-disable-line @typescript-eslint/no-explicit-any

let _client: AnyClient | null = null;

function getClient(): AnyClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("[factory] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  }
  _client = createClient(url, serviceKey, {
    db: { schema: "factory" },
    auth: { persistSession: false },
  });
  return _client;
}

export const db: AnyClient = new Proxy({} as AnyClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export interface Brand {
  id: string;
  name: string;
  slug: string;
  letterman_publication_id: string | null;
  from_name: string | null;
  from_email: string | null;
  coverage: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  brand_id: string;
  newsletter_type_id: string | null;
  title: string;
  letterman_newsletter_id: string | null;
  letterman_storage_id: string | null;
  status: "draft" | "generated" | "scheduled" | "sent" | "failed";
  scheduled_for: string | null;
  sent_at: string | null;
  error: string | null;
  created_at: string;
}
