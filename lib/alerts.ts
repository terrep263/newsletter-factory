/**
 * Alert events — in-memory ring buffer (last 200) with write-through to
 * DATA_DIR/alerts.json.  Survives request boundaries but NOT container
 * restarts.  Set DATA_DIR to a mounted volume for durability.
 *
 * SERVER ONLY. Never import into a client component.
 */

import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";

export type AlertLevel = "info" | "warn" | "error" | "critical";

export interface AlertEvent {
  id: string;
  level: AlertLevel;
  category: string;
  message: string;
  detail?: string;
  newsletterId?: string;
  ts: string;
}

const MAX = 200;
const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), "data");
const ALERTS_FILE = join(DATA_DIR, "alerts.json");

const ring: AlertEvent[] = [];
let loaded = false;
let seq = 0;

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    const raw = readFileSync(ALERTS_FILE, "utf-8");
    const arr = JSON.parse(raw) as AlertEvent[];
    ring.push(...arr.slice(-MAX));
  } catch { /* start empty if file missing or unparseable */ }
}

function persist(): void {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(ALERTS_FILE, JSON.stringify(ring.slice(-MAX), null, 2), "utf-8");
  } catch { /* non-fatal — alerts still appear in stdout */ }
}

export function addAlert(
  level: AlertLevel,
  category: string,
  message: string,
  opts: { detail?: string; newsletterId?: string } = {},
): AlertEvent {
  ensureLoaded();
  const ev: AlertEvent = {
    id: `${Date.now()}-${++seq}`,
    level,
    category,
    message,
    ts: new Date().toISOString(),
    ...opts,
  };
  ring.push(ev);
  if (ring.length > MAX) ring.splice(0, ring.length - MAX);
  persist();
  console.error(JSON.stringify({ alert: true, ...ev }));
  return ev;
}

export function getAlerts(
  opts: { limit?: number; level?: AlertLevel } = {},
): AlertEvent[] {
  ensureLoaded();
  let result = [...ring].reverse(); // newest first
  if (opts.level) result = result.filter((e) => e.level === opts.level);
  return opts.limit ? result.slice(0, opts.limit) : result;
}
