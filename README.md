# Newsletter Factory

A multi-brand newsletter control panel built on the **Letterman API**.
Collect hyperlocal info → assemble issues → publish to subscribers, at scale,
from one dashboard. Starts with **The 352 Beat**; architected so adding a brand
(Urban Orlando, SMN, BOL…) is a row, not a rewrite.

## Architecture

```
Next.js (one app, front + back)
├── Frontend  — editorial dashboard (Desk, Brands, Inbox, Issues, Sources)
├── Backend   — API routes / server actions
│     ├── lib/letterman.ts  → Letterman API (token via env, server-only)
│     └── lib/supabase.ts   → Supabase `factory` schema (service-role, server-only)
└── Deploy    — Docker (standalone) → Coolify on Hostinger VPS
```

- **One Letterman account** powers every brand → brands map to Letterman
  publication IDs; the token is a single env var, never in the DB.
- **Database:** Supabase project *New SMN*, isolated `factory` schema.
  Tables: brands, newsletter_types, content_sources, content_items, issues, issue_items.

## Local dev

```bash
cp .env.example .env.local   # fill in LETTERMAN_TOKEN + SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev
```

## Deploy (Coolify)

1. Point a Coolify application at this Git repo.
2. Build pack: Dockerfile.
3. Set env vars: `LETTERMAN_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
4. Assign a subdomain (wildcard SSL). Deploy.

Rotating the Letterman token = change one Coolify env var. No code change.

## Roadmap

- [x] Letterman API client
- [x] Supabase data model (factory schema)
- [x] App shell (Desk / Brands) + brands API
- [ ] Confirm Letterman `section` write body
- [ ] Content Inbox + Issues UI
- [ ] 352 collector (permits / Legistar / events → RSS or sections)
- [ ] Scheduling + send
- [ ] Coolify deploy
