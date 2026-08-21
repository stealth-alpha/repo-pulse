import { clamp, round } from "../util.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Start (ms) of the UTC week (Monday 00:00) containing `t`. */
export function weekStart(t) {
  const d = new Date(t);
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return midnight - day * DAY_MS;
}

/**
 * Commit velocity: commits per week over a trailing window.
 *
 * @param {Array<{date: string}>} commits  newest-first or any order
 * @param {{weeks?: number, now?: Date|number}} opts
 * @returns {{
 *   weeks: number, perWeek: number[], total: number,
 *   average: number, current: number, previous: number,
 *   trend: "up"|"down"|"flat"
 * }}
 */
export function commitVelocity(commits, opts = {}) {
  const { weeks = 12, now = Date.now() } = opts;
  const n = Math.max(1, Math.floor(weeks));
  const nowMs = now instanceof Date ? now.getTime() : now;
  const end = weekStart(nowMs);
  const buckets = new Array(n).fill(0);

  for (const commit of commits || []) {
    const t = new Date(commit.date).getTime();
    if (Number.isNaN(t)) continue;
    const ws = weekStart(t);
    const idx = Math.round((end - ws) / WEEK_MS);
    if (idx >= 0 && idx < n) buckets[n - 1 - idx] += 1;
  }

  const total = buckets.reduce((a, b) => a + b, 0);
  const average = total / n;

  // Trend: most recent half of the window vs older half.
  const half = Math.floor(n / 2);
  const recent = buckets.slice(n - half).reduce((a, b) => a + b, 0);
  const older = buckets.slice(0, n - half).reduce((a, b) => a + b, 0);
  let trend = "flat";
  if (older === 0) {
    trend = recent > 0 ? "up" : "flat";
  } else {
    const delta = (recent - older) / older;
    if (delta > 0.1) trend = "up";
    else if (delta < -0.1) trend = "down";
  }

  return {
    weeks: n,
    perWeek: buckets,
    total,
    average: round(average, 1),
    current: buckets[n - 1],
    previous: buckets[n - 2] ?? 0,
    trend,
  };
}

/** Score 0..100 from average commits/week (5+/week saturates). */
export function velocityScore(velocity) {
  if (!velocity) return null;
  return clamp(Math.round((velocity.average / 5) * 100), 0, 100);
}
