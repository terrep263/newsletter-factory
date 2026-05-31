/**
 * Supabase server client — Newsletter Factory
 * SERVER ONLY. Uses the service-role key, scoped to the `factory` schema.
 * Never import into a client component.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  // Fail loud at boot rather than silently mis-querying.
  console.warn("[factory] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
}

export const db = createClient(url, serviceKey, {
  db: { schema: "factory" },
  auth: { persistSession: false },
});

// --- typed row helpers (kept light; expand as the app grows) ---
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
