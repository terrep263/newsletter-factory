import { NextRequest, NextResponse } from "next/server";
import lm, { LettermanError } from "@/lib/letterman";
import {
  getAllApprovals,
  getApproval,
  upsertApproval,
  markApproved,
  markRejected,
} from "@/lib/approval";
import { audit } from "@/lib/audit";
import { addAlert } from "@/lib/alerts";
import { sendApprovalNotice } from "@/lib/notify";

export const dynamic = "force-dynamic";

const CONFIRM_PHRASE = "APPROVE SCHEDULED NEWSLETTER SEND";

export async function GET() {
  const approvals = getAllApprovals();
  return NextResponse.json({ ok: true, approvals });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const action = String(b?.action ?? "").trim();
  const newsletterId = String(b?.newsletterId ?? "").trim();

  if (!newsletterId)
    return NextResponse.json({ ok: false, error: "newsletterId required" }, { status: 400 });

  if (action === "init") {
    const record = upsertApproval(newsletterId, {
      newsletterTitle: b?.newsletterTitle ? String(b.newsletterTitle) : undefined,
      subject: b?.subject ? String(b.subject) : undefined,
    });
    return NextResponse.json({ ok: true, record });
  }

  if (action === "notify") {
    const record = getApproval(newsletterId);
    const baseUrl = process.env.FACTORY_BASE_URL ?? "";
    const result = await sendApprovalNotice({
      newsletterTitle: record?.newsletterTitle ?? newsletterId,
      subject: record?.subject,
      previewAvailable: record?.previewAvailable ?? false,
      testSendStatus: record?.testSendCompletedAt ? `Sent to ${record.testSendRecipient}` : "Not yet sent",
      scheduledFor: record?.scheduleDateTime,
      audienceSummary: record?.audienceSummary,
      warnings: [],
      approvalUrl: `${baseUrl}/admin/approval`,
    } as Parameters<typeof sendApprovalNotice>[0]);
    return NextResponse.json({ ok: true, ...result });
  }

  if (action === "nogo") {
    const reason = String(b?.reason ?? "").trim() || "No reason provided";
    const record = markRejected(newsletterId, reason);
    audit({ event: "NOGO_RECORDED", newsletterId, reason });
    addAlert("warn", "NOGO", `NO GO recorded for ${newsletterId}`, { newsletterId, detail: reason });
    return NextResponse.json({ ok: true, record });
  }

  if (action === "go") {
    audit({ event: "GO_ATTEMPTED", newsletterId });

    const approvalPw = process.env.PUBLISH_APPROVAL_PASSWORD;
    if (!approvalPw) {
      audit({ event: "GO_REJECTED", newsletterId, reason: "PUBLISH_APPROVAL_PASSWORD not configured" });
      addAlert("critical", "AUTH_MISCONFIGURED", "GO attempted but PUBLISH_APPROVAL_PASSWORD not set");
      return NextResponse.json({ ok: false, error: "PUBLISH_APPROVAL_PASSWORD is not configured. Set it in environment variables." }, { status: 403 });
    }

    const submitted = String(b?.password ?? "");
    if (submitted !== approvalPw) {
      audit({ event: "GO_REJECTED", newsletterId, reason: "Incorrect approval password" });
      return NextResponse.json({ ok: false, error: "Incorrect approval password." }, { status: 403 });
    }

    const phrase = String(b?.confirmPhrase ?? "");
    if (phrase !== CONFIRM_PHRASE) {
      audit({ event: "GO_REJECTED", newsletterId, reason: "Wrong confirmation phrase" });
      return NextResponse.json({ ok: false, error: `Confirmation phrase must be exactly: ${CONFIRM_PHRASE}` }, { status: 400 });
    }

    const record = getApproval(newsletterId);
    if (!record) {
      return NextResponse.json({ ok: false, error: "No approval record found. Call action=init first." }, { status: 404 });
    }

    if (record.approvalStatus === "stale") {
      audit({ event: "GO_REJECTED", newsletterId, reason: "Approval is stale" });
      return NextResponse.json({ ok: false, error: "Approval is stale — re-complete preview and test-send after the last edit." }, { status: 400 });
    }

    if (!record.previewCompletedAt) {
      return NextResponse.json({ ok: false, error: "Preview must be completed and marked before GO." }, { status: 400 });
    }

    if (!record.testSendCompletedAt) {
      return NextResponse.json({ ok: false, error: "A test email must be sent and confirmed before GO." }, { status: 400 });
    }

    if (record.scheduleDateTime) {
      const schedDate = new Date(record.scheduleDateTime);
      if (isNaN(schedDate.getTime()) || schedDate <= new Date()) {
        return NextResponse.json({ ok: false, error: "Schedule date/time must be a valid future date." }, { status: 400 });
      }
    }

    const liveBroadcast = process.env.ENABLE_LIVE_BROADCAST === "true";
    if (!liveBroadcast) {
      const approved = markApproved(newsletterId);
      audit({ event: "GO_APPROVED", newsletterId, broadcastFired: false, reason: "ENABLE_LIVE_BROADCAST=false" });
      addAlert("info", "BROADCAST_DISABLED", `GO approved for ${newsletterId} but live broadcast is disabled`, { newsletterId });
      return NextResponse.json({
        ok: true,
        approved: true,
        broadcastFired: false,
        message: "Approval workflow validated, but live publishing is disabled by ENABLE_LIVE_BROADCAST=false. Set ENABLE_LIVE_BROADCAST=true in environment variables to enable real broadcasting.",
        record: approved,
      });
    }

    try {
      await lm.newsletters.sendEmail(newsletterId, {});
      const approved = markApproved(newsletterId);
      audit({ event: "GO_APPROVED", newsletterId, broadcastFired: true });
      return NextResponse.json({ ok: true, approved: true, broadcastFired: true, message: "GO approved and live broadcast initiated via Letterman.", record: approved });
    } catch (e) {
      const msg = e instanceof LettermanError ? e.message : (e instanceof Error ? e.message : String(e));
      audit({ event: "GO_REJECTED", newsletterId, reason: `sendEmail failed: ${msg}` });
      addAlert("error", "BROADCAST_FAILED", `Live broadcast failed: ${msg}`, { newsletterId });
      const status = e instanceof LettermanError ? (e.status || 500) : 500;
      return NextResponse.json({ ok: false, error: `Broadcast failed: ${msg}` }, { status });
    }
  }

  return NextResponse.json({ ok: false, error: "action must be one of: init, notify, nogo, go" }, { status: 400 });
}
