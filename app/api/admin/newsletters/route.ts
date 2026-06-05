import { NextResponse } from "next/server";
import lm, { LettermanError } from "@/lib/letterman";
import { addAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await lm.newsletters.list();
    return NextResponse.json({ ok: true, newsletters: list });
  } catch (e) {
    if (e instanceof LettermanError) {
      if (e.status === 403) addAlert("critical", "LETTERMAN_403", "403 on newsletters list");
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status || 500 });
    }
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
