import { NextRequest, NextResponse } from "next/server";

/**
 * App-wide login gate (HTTP Basic Auth).
 * Single-operator internal tool — no account system needed.
 *
 * Credentials come from env:
 *   FACTORY_USER, FACTORY_PASS
 * If either is unset, the gate is OPEN (so first deploy isn't locked out);
 * set both in Coolify to turn protection on.
 *
 * /api/cron is exempt — it carries its own CRON_SECRET and is called by
 * the scheduler, not a browser.
 */
export const config = {
  // run on everything except Next internals & static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export function middleware(req: NextRequest) {
  // cron has its own auth
  if (req.nextUrl.pathname.startsWith("/api/cron")) return NextResponse.next();

  const USER = process.env.FACTORY_USER;
  const PASS = process.env.FACTORY_PASS;
  if (!USER || !PASS) return NextResponse.next(); // gate disabled until configured

  const header = req.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const idx = decoded.indexOf(":");
      const u = decoded.slice(0, idx);
      const p = decoded.slice(idx + 1);
      if (u === USER && p === PASS) return NextResponse.next();
    } catch { /* fall through to challenge */ }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Newsletter Factory", charset="UTF-8"' },
  });
}
