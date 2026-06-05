/**
 * Approval notification — prepares payload and logs it server-side.
 * NO EMAIL PROVIDER IS WIRED. Set NOTIFY_EMAIL_TO + a mail client to deliver.
 * SERVER ONLY.
 */

import { audit } from "./audit";

export interface ApprovalNoticePayload {
  newsletterTitle: string;
  subject?: string;
  previewAvailable: boolean;
  testSendStatus: string;
  scheduledFor?: string;
  publicationName?: string;
  warnings: string[];
  approvalUrl: string;
}

export async function sendApprovalNotice(
  payload: ApprovalNoticePayload,
): Promise<{ sent: boolean; method: "email" | "log" }> {
  console.log(
    JSON.stringify({
      notice: "APPROVAL_READY",
      ts: new Date().toISOString(),
      ...payload,
    }),
  );

  const notifyTo = process.env.NOTIFY_EMAIL_TO;
  if (!notifyTo) {
    audit({ event: "APPROVAL_NOTICE_PREPARED" });
    return { sent: false, method: "log" };
  }

  audit({ event: "APPROVAL_NOTICE_PREPARED" });
  return { sent: false, method: "log" };
}
