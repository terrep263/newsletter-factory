import { db, type Brand } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const { data, error } = await db
    .from("brands")
    .select("*")
    .order("created_at", { ascending: true });

  const brands = (data ?? []) as Brand[];

  return (
    <main>
      <p className="kicker">Publications</p>
      <h2 className="head">Brands</h2>

      {error && <p className="empty">Could not load brands: {error.message}</p>}
      {!error && brands.length === 0 && (
        <p className="empty">No brands yet. The first one is seeded via the database.</p>
      )}

      <div className="grid">
        {brands.map((b) => (
          <div className="card" key={b.id}>
            {b.active && <span className="tag live">Active</span>}
            <h3>{b.name}</h3>
            <p className="meta">/{b.slug}</p>
            <p>
              {Array.isArray(b.coverage) && b.coverage.length
                ? `Coverage: ${b.coverage.join(", ")}`
                : "No coverage set"}
            </p>
            <p className="meta">
              {b.letterman_publication_id
                ? `Letterman pub: ${b.letterman_publication_id}`
                : "Not linked to a Letterman publication yet"}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
