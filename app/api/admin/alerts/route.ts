import { NextResponse } from "next/server";
import { getAlerts } from "@/lib/alerts";

export const dynamic = "force-dynamic";

export async function GET() {
  const alerts = getAlerts({ limit: 100 });
  return NextResponse.json({ ok: true, alerts });
}
