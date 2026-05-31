import { NextRequest, NextResponse } from "next/server";

/**
 * Login gate (HTTP Basic Auth) for the internal factory tool.
 * Single-operator — no account system needed.
 *
 * PUBLIC (no auth): the marketing landing page "/" and /api/cron
 * (cron carries its own CRON_SECRET). Everything else requires login.
 *
 * Credentials: FACTORY_USER / FACTORY_PASS (Coolify env). If either is
 * unset the gate is OPEN, so a first deploy can't lock itself out.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const PUBLIC_PATHS = ["/"]; // the landing page is public

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // public routes
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (pathname.startsWith("/api/cron")) return NextResponse.next();

  const USER = process.env.FACTORY_USER;
  const PASS = process.env.FACTORY_PASS;
  if (!USER || !PASS) return NextResponse.next(); // gate disabled until configured

  const header = req.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const idx = decoded.indexOf(":");
      if (decoded.slice(0, idx) === USER && decoded.slice(idx + 1) === PASS) {
        return NextResponse.next();
      }
    } catch { /* fall through to challenge */ }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Newsletter Factory", charset="UTF-8"' },
  });
}
