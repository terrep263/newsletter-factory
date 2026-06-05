import { NextResponse } from "next/server";
import lm, { LettermanError } from "@/lib/letterman";
import { addAlert } from "@/lib/alerts";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const tokenPresent = !!process.env.LETTERMAN_TOKEN;
  const baseUrl = process.env.LETTERMAN_BASE_URL ?? "https://api.letterman.ai/api";
  const factoryUser = !!process.env.FACTORY_USER;
  const factoryPass = !!process.env.FACTORY_PASS;
  const approvalPw = !!process.env.PUBLISH_APPROVAL_PASSWORD;
  const liveBroadcast = process.env.ENABLE_LIVE_BROADCAST === "true";
  const rawSendBlocked = true;

  let lettermanOk = false;
  let lettermanError: string | undefined;
  let newsletterCount: number | undefined;

  if (tokenPresent) {
    try {
      const list = (await lm.newsletters.list()) as unknown[];
      lettermanOk = true;
      newsletterCount = list.length;
    } catch (e) {
      if (e instanceof LettermanError) {
        if (e.status === 403) {
          addAlert("critical", "LETTERMAN_403", "Letterman returned 403 during diagnostics read test");
          audit({ event: "LETTERMAN_403", path: "/newsletters" });
        }
        lettermanError = `${e.status}: ${e.message}`;
      } else {
        lettermanError = e instanceof Error ? e.message : String(e);
      }
      audit({ event: "DIAGNOSTICS_FAILED", reason: lettermanError });
    }
  } else {
    lettermanError = "LETTERMAN_TOKEN not set";
    addAlert("critical", "LETTERMAN_TOKEN_MISSING", "LETTERMAN_TOKEN is not configured");
    audit({ event: "LETTERMAN_TOKEN_MISSING" });
  }

  const issues: string[] = [];
  if (!tokenPresent) issues.push("LETTERMAN_TOKEN not set — all Letterman calls will fail");
  if (!factoryUser || !factoryPass) issues.push("FACTORY_USER / FACTORY_PASS not configured — auth gate returns 503");
  if (!approvalPw) issues.push("PUBLISH_APPROVAL_PASSWORD not set — GO approval is blocked");
  if (liveBroadcast) issues.push("ENABLE_LIVE_BROADCAST=true — live sending is active");
  if (!lettermanOk && tokenPresent) issues.push(`Letterman read test failed: ${lettermanError}`);

  return NextResponse.json({
    ok: true,
    token: tokenPresent ? "present" : "missing",
    baseUrl,
    userAgentApplied: true,
    factoryUser: factoryUser ? "configured" : "missing",
    factoryPass: factoryPass ? "configured" : "missing",
    approvalPassword: approvalPw ? "configured" : "missing",
    liveBroadcast,
    rawSendBlocked,
    lettermanOk,
    lettermanError,
    newsletterCount,
    issues,
    ts: new Date().toISOString(),
  });
}
