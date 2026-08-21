import { clamp } from "./util.js";
import { commitVelocity, velocityScore } from "./metrics/velocity.js";
import { busFactor, busFactorScore } from "./metrics/busfactor.js";
import {
  findStaleDeps,
  staleDepsScore,
} from "./metrics/deps.js";
import { issueHalfLife, issueHalfLifeScore } from "./metrics/issues.js";

export const DEFAULT_SNAPSHOT_OPTS = {
  weeks: 12,
  maxAgeMonths: 12,
};

/**
 * Build the health snapshot from already-collected inputs.
 *
 * @param {{
 *   commits: Array,
 *   deps: Array<{name: string, version: string, dev?: boolean}>,
 *   publishTimes: Record<string, string>,
 *   issues: Array|null,
 * }} inputs
 * @param {{weeks?: number, maxAgeMonths?: number, now?: Date|number}} opts
 */
export function buildSnapshot(inputs, opts = {}) {
  const options = { ...DEFAULT_SNAPSHOT_OPTS, ...opts };

  const velocity = commitVelocity(inputs.commits || [], {
    weeks: options.weeks,
    now: options.now ?? Date.now(),
  });
  const factor = busFactor(inputs.commits || []);
  const stale = findStaleDeps(
    inputs.deps || [],
    inputs.publishTimes || {},
    { now: options.now ?? Date.now(), maxAgeMonths: options.maxAgeMonths }
  );
  const halfLife =
    inputs.issues === null ? null : issueHalfLife(inputs.issues || []);

  const components = [
    { key: "velocity", score: velocityScore(velocity) },
    { key: "busFactor", score: busFactorScore(factor) },
    { key: "deps", score: staleDepsScore(stale) },
    { key: "issues", score: issueHalfLifeScore(halfLife) },
  ];
  const scored = components.filter((c) => c.score !== null);
  const overall =
    scored.length > 0
      ? Math.round(
          scored.reduce((a, c) => a + c.score, 0) / scored.length
        )
      : null;

  return {
    generatedAt:
      (options.now ? new Date(options.now) : new Date()).toISOString(),
    metrics: { velocity, busFactor: factor, staleDeps: stale, issueHalfLife: halfLife },
    scores: {
      overall,
      grade: gradeFor(overall),
      components: Object.fromEntries(
        components.map((c) => [c.key, c.score])
      ),
    },
  };
}

/** Attach repo metadata (name, branch, head) to a snapshot. */
export function withRepoInfo(snapshot, info) {
  return { ...snapshot, repo: info };
}

const GRADES = [
  [90, "A"],
  [75, "B"],
  [60, "C"],
  [40, "D"],
];

/** Letter grade for an overall 0..100 score. */
export function gradeFor(score) {
  if (score === null || score === undefined) return "?";
  for (const [min, letter] of GRADES) {
    if (score >= min) return letter;
  }
  return "F";
}

/**
 * Health verdict color used by badges: brightgreen/green/yellow/orange/red.
 */
export function healthColor(score) {
  if (score === null || score === undefined) return "lightgrey";
  const s = clamp(score, 0, 100);
  if (s >= 90) return "brightgreen";
  if (s >= 75) return "green";
  if (s >= 60) return "yellowgreen";
  if (s >= 40) return "orange";
  return "red";
}
