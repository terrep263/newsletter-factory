import { NextRequest, NextResponse } from "next/server";
import { raw, LettermanError } from "@/lib/letterman";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["GET", "POST", "PUT", "DELETE"]);
const LIVE_SEND_RE = /^\/newsletters\/send-email(\/|$)/;

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const method = String(b?.method || "GET").toUpperCase();
  const path = String(b?.path || "");
  const body = b && typeof b.body === "object" && b.body !== null ? b.body : undefined;

  if (!ALLOWED.has(method)) {
    return NextResponse.json({ ok: false, error: "method must be GET/POST/PUT/DELETE" }, { status: 400 });
  }
  if (!path.startsWith("/")) {
    return NextResponse.json({ ok: false, error: "path must start with /" }, { status: 400 });
  }

  const normPath = decodeURIComponent(path).toLowerCase().replace(/\/+$/, "");
  if (LIVE_SEND_RE.test(normPath + "/")) {
    return NextResponse.json(
      { ok: false, error: "Live broadcast sending is blocked from the raw admin console. Use send-test-email only." },
      { status: 403 },
    );
  }

  try {
    const data = await raw(method as "GET" | "POST" | "PUT" | "DELETE", path, body);
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    if (e instanceof LettermanError) {
      return NextResponse.json({ ok: false, status: e.status, error: e.message, body: e.body });
    }
    return NextResponse.json({ ok: false, error: String(e) });
  }
}
