/**
 * Approval state — in-memory Map with write-through to DATA_DIR/approval-state.json.
 *
 * PERSISTENCE LIMITATION: survives request boundaries within one process,
 * but is lost on container restart. For durable storage create a
 * `factory.newsletter_approvals` Supabase table and swap this module.
 * Set DATA_DIR to a mounted volume to improve durability between restarts.
 *
 * SERVER ONLY. Never import into a client component.
 */

import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "stale"
  | "blocked";

export interface ApprovalRecord {
  newsletterId: string;
  newsletterTitle?: string;
  subject?: string;
  previewCompletedAt?: string;
  previewAvailable: boolean;
  testSendCompletedAt?: string;
  testSendRecipient?: string;
  scheduleDateTime?: string;
  audienceReviewedAt?: string;
  audienceSummary?: string;
  approvalStatus: ApprovalStatus;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  lastEditedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), "data");
const STATE_FILE = join(DATA_DIR, "approval-state.json");

const store = new Map<string, ApprovalRecord>();
let loaded = false;

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const raw = readFileSync(STATE_FILE, "utf-8");
    const arr = JSON.parse(raw) as ApprovalRecord[];
    arr.forEach((r) => store.set(r.newsletterId, r));
  } catch { /* start empty */ }
}

function persist(): void {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(
      STATE_FILE,
      JSON.stringify([...store.values()], null, 2),
      "utf-8",
    );
  } catch (e) {
    console.error("[approval] persist failed:", String(e));
  }
}

export function getApproval(newsletterId: string): ApprovalRecord | undefined {
  ensureLoaded();
  return store.get(newsletterId);
}

export function getAllApprovals(): ApprovalRecord[] {
  ensureLoaded();
  return [...store.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function getPendingApprovals(): ApprovalRecord[] {
  return getAllApprovals().filter((r) => r.approvalStatus === "pending");
}

export function upsertApproval(
  newsletterId: string,
  patch: Partial<Omit<ApprovalRecord, "newsletterId" | "createdAt">>,
): ApprovalRecord {
  ensureLoaded();
  const now = new Date().toISOString();
  const existing = store.get(newsletterId);
  const base: ApprovalRecord = existing ?? {
    newsletterId,
    previewAvailable: false,
    approvalStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };
  const record: ApprovalRecord = { ...base, ...patch, newsletterId, updatedAt: now };
  store.set(newsletterId, record);
  persist();
  return record;
}

export function markPreviewCompleted(newsletterId: string): ApprovalRecord {
  return upsertApproval(newsletterId, {
    previewCompletedAt: new Date().toISOString(),
    previewAvailable: true,
  });
}

export function markTestSendCompleted(
  newsletterId: string,
  recipient: string,
): ApprovalRecord {
  return upsertApproval(newsletterId, {
    testSendCompletedAt: new Date().toISOString(),
    testSendRecipient: recipient,
  });
}

export function markApproved(newsletterId: string): ApprovalRecord {
  return upsertApproval(newsletterId, {
    approvalStatus: "approved",
    approvedAt: new Date().toISOString(),
  });
}

export function markRejected(
  newsletterId: string,
  reason?: string,
): ApprovalRecord {
  return upsertApproval(newsletterId, {
    approvalStatus: "rejected",
    rejectedAt: new Date().toISOString(),
    rejectionReason: reason,
  });
}

export function markStale(newsletterId: string): ApprovalRecord {
  return upsertApproval(newsletterId, { approvalStatus: "stale" });
}
