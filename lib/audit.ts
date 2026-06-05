/**
 * Audit log — structured JSON to stdout/stderr.
 * SERVER ONLY. Never import into a client component.
 */

export type AuditEvent =
  | "LIVE_SEND_BLOCKED"
  | "PREVIEW_COMPLETED"
  | "TEST_SEND_ATTEMPTED"
  | "TEST_SEND_SUCCEEDED"
  | "TEST_SEND_FAILED"
  | "GO_ATTEMPTED"
  | "GO_APPROVED"
  | "GO_REJECTED"
  | "NOGO_RECORDED"
  | "AUTH_MISCONFIGURED"
  | "DIAGNOSTICS_FAILED"
  | "APPROVAL_NOTICE_PREPARED"
  | "APPROVAL_NOTICE_FAILED"
  | "LETTERMAN_403"
  | "LETTERMAN_TOKEN_MISSING";

interface AuditPayload {
  event: AuditEvent;
  newsletterId?: string;
  [k: string]: unknown;
}

export function audit(payload: AuditPayload): void {
  console.log(
    JSON.stringify({ audit: true, ts: new Date().toISOString(), ...payload }),
  );
}
