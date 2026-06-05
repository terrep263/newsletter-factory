import { NextRequest, NextResponse } from "next/server";
import lm, { LettermanError } from "@/lib/letterman";
import { markTestSendCompleted } from "@/lib/approval";
import { audit } from "@/lib/audit";
import { addAlert } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const id = String(b?.newsletterId ?? "").trim();
  const email = String(b?.email ?? "").trim();

  if (!id) return NextResponse.json({ ok: false, error: "newsletterId required" }, { status: 400 });
  if (!email || !email.includes("@")) return NextResponse.json({ ok: false, error: "valid email address required" }, { status: 400 });

  audit({ event: "TEST_SEND_ATTEMPTED", newsletterId: id, recipient: email });

  try {
    await lm.newsletters.sendTestEmail(id, { email });
    markTestSendCompleted(id, email);
    audit({ event: "TEST_SEND_SUCCEEDED", newsletterId: id, recipient: email });
    return NextResponse.json({ ok: true, message: `Test email sent to ${email}` });
  } catch (e) {
    const msg = e instanceof LettermanError ? e.message : (e instanceof Error ? e.message : String(e));
    if (e instanceof LettermanError && e.status === 403) addAlert("critical", "LETTERMAN_403", "403 on test-send", { newsletterId: id });
    addAlert("error", "TEST_SEND_FAILED", msg, { newsletterId: id });
    audit({ event: "TEST_SEND_FAILED", newsletterId: id, error: msg });
    const status = e instanceof LettermanError ? (e.status || 500) : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
