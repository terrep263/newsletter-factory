import { NextRequest, NextResponse } from "next/server";
import { COOKIE_MAX_AGE, COOKIE_NAME, createAuthCookieValue, isFactoryAuthConfigured, validateFactoryCredentials } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!isFactoryAuthConfigured()) {
    return NextResponse.json({ error: "Authentication is not configured. Set FACTORY_USER and FACTORY_PASS." }, { status: 503 });
  }

  const body = await req.json();
  const username = String(body.username ?? "");
  const password = String(body.password ?? "");

  if (!validateFactoryCredentials(username, password)) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: createAuthCookieValue(),
    httpOnly: true,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
