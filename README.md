# Newsletter Factory

Hyperlocal newsletter production system for Common Ground Press (The 352 Beat),
built on Next.js 16 (App Router) + Supabase (`factory` schema) + the Letterman API,
deployed via Docker / Coolify.

## What it does
- **Collect** — pulls RSS/Atom sources into a review inbox (`/sources`, `/api/cron`)
- **Assemble** — approve inbox items and build an issue (`/inbox`, `/issues`)
- **Publish** — push an issue to Letterman, then a gated GO / NO-GO approval flow (`/admin/approval`)

## Auth
Cookie-based staff login (`/login`) enforced by `proxy.ts`. Public paths: `/`, `/tip`,
`/api/top-story`, `/api/tips`, `/api/cron`, and the auth routes.

## Publishing safety
Live sends require: preview completed + test-send completed + `PUBLISH_APPROVAL_PASSWORD`
+ exact phrase `APPROVE SCHEDULED NEWSLETTER SEND` + `ENABLE_LIVE_BROADCAST=true`.
The raw Letterman console blocks `/newsletters/send-email/*`.

## Environment
See `.env.example`. Required: `LETTERMAN_TOKEN`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `FACTORY_USER`, `FACTORY_PASS`, `PUBLISH_APPROVAL_PASSWORD`.
Optional: `CRON_SECRET`, `GLOBALCONTROL_API_KEY`, `NOTIFY_EMAIL_TO`, `DATA_DIR`.

## Deploy
Docker (standalone output) via Coolify. Build: `npm run build`. Start: `node server.js` (port 3000).
