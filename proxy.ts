import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, isFactoryAuthConfigured, isValidAuthCookie } from "@/lib/auth";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const PUBLIC_PATHS = [
  "/",
  "/tip",
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/cron",
  "/api/build",
  "/api/build-newsletterly",
  "/api/top-story",
  "/api/tips",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico")) {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!isFactoryAuthConfigured()) {
    return new NextResponse(
      "Authentication is not configured. Set FACTORY_USER and FACTORY_PASS environment variables.",
      { status: 503, headers: { "Content-Type": "text/plain" } },
    );
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (isValidAuthCookie(cookie)) {
    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}
