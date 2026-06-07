import { NextRequest, NextResponse } from "next/server";
import { assembleIssue, AssembleError } from "@/lib/assemble";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  if (!b?.issue_id) return NextResponse.json({ error: "issue_id required" }, { status: 400 });
  try {
    const result = await assembleIssue(b.issue_id);
    return NextResponse.json(result);
  } catch (e) {
    const status = e instanceof AssembleError ? e.status : 500;
    const error = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error }, { status });
  }
}
