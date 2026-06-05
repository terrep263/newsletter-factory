import { NextRequest, NextResponse } from "next/server";
import lm, { LettermanError } from "@/lib/letterman";
import { markPreviewCompleted } from "@/lib/approval";
import { audit } from "@/lib/audit";
import { addAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  try {
    const [nl, sections] = await Promise.all([
      lm.newsletters.get(id),
      lm.newsletters.sections(id),
    ]);
    return NextResponse.json({ ok: true, newsletter: nl, sections });
  } catch (e) {
    if (e instanceof LettermanError) {
      if (e.status === 403) addAlert("critical", "LETTERMAN_403", "403 on preview fetch", { newsletterId: id });
      addAlert("error", "PREVIEW_FAILED", `Preview fetch failed: ${e.message}`, { newsletterId: id });
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status || 500 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    addAlert("error", "PREVIEW_FAILED", msg, { newsletterId: id });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const id = String(b?.newsletterId ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "newsletterId required" }, { status: 400 });

  const record = markPreviewCompleted(id);
  audit({ event: "PREVIEW_COMPLETED", newsletterId: id });
  return NextResponse.json({ ok: true, record });
}
