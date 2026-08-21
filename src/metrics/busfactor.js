import { round } from "../util.js";

/**
 * Bus factor: the smallest number of contributors whose disappearance would
 * leave less than half of the recent commit activity. Computed as the number
 * of top contributors (by commit count) needed to reach >=50% of commits.
 *
 * @param {Array<{author: string, email: string}>} commits
 * @returns {{
 *   score: number,
 *   contributors: number,
 *   top: Array<{name: string, commits: number, share: number}>,
 *   risk: "critical"|"low"|"healthy"
 * }}
 */
export function busFactor(commits) {
  const counts = new Map();
  for (const commit of commits || []) {
    const key = commit.email || commit.author;
    if (!key) continue;
    const entry = counts.get(key) || {
      name: commit.author || key,
      email: commit.email || null,
      commits: 0,
    };
    entry.commits += 1;
    if (commit.author) entry.name = commit.author;
    counts.set(key, entry);
  }

  const total = [...counts.values()].reduce((a, c) => a + c.commits, 0);
  if (total === 0) {
    return { score: 0, contributors: 0, top: [], risk: "critical" };
  }

  const sorted = [...counts.values()].sort((a, b) => b.commits - a.commits);
  const top = sorted.slice(0, 10).map((c) => ({
    name: c.name,
    commits: c.commits,
    share: round(c.commits / total, 3),
  }));

  let acc = 0;
  let score = 0;
  for (const c of sorted) {
    acc += c.commits;
    score += 1;
    if (acc / total >= 0.5) break;
  }

  const risk =
    score <= 1 ? "critical" : score === 2 ? "low" : "healthy";

  return { score, contributors: sorted.length, top, risk };
}

/** Score 0..100 from bus factor. */
export function busFactorScore(factor) {
  if (!factor || factor.contributors === 0) return null;
  switch (factor.score) {
    case 1:
      return 15;
    case 2:
      return 50;
    case 3:
      return 80;
    default:
      return 100;
  }
}
