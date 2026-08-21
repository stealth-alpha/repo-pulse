const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Issue half-life: the median time it takes an issue to be closed, in days.
 * A lower half-life means issues get resolved quickly; a high one suggests a
 * growing backlog. Open issues are counted but excluded from the median.
 *
 * @param {Array<{state: string, created_at: string, closed_at?: string|null}>} issues
 */
export function issueHalfLife(issues) {
  const list = issues || [];
  const open = list.filter((i) => i.state === "open").length;
  const durations = [];
  for (const issue of list) {
    if (issue.state !== "closed" || !issue.closed_at || !issue.created_at)
      continue;
    const t0 = new Date(issue.created_at).getTime();
    const t1 = new Date(issue.closed_at).getTime();
    if (Number.isNaN(t0) || Number.isNaN(t1)) continue;
    durations.push((t1 - t0) / DAY_MS);
  }
  durations.sort((a, b) => a - b);

  if (durations.length === 0) {
    return {
      halfLifeDays: null,
      closed: 0,
      open,
      sample: list.length,
    };
  }

  const mid = Math.floor(durations.length / 2);
  const median =
    durations.length % 2 === 1
      ? durations[mid]
      : (durations[mid - 1] + durations[mid]) / 2;

  return {
    halfLifeDays: Math.round(median * 10) / 10,
    closed: durations.length,
    open,
    sample: list.length,
  };
}

/**
 * Score 0..100 from half-life: <=7 days is perfect, >=180 days scores 0,
 * linear in between. Returns null when unknown (no data / offline).
 */
export function issueHalfLifeScore(halfLife) {
  if (!halfLife || halfLife.halfLifeDays === null) return null;
  const days = halfLife.halfLifeDays;
  const span = Math.min(Math.max(days, 7), 180);
  return Math.round((1 - (span - 7) / 173) * 100);
}

/** Extract `owner/name` from the configured GitHub repo slug. */
export function parseRepoSlug(slug) {
  if (!slug) return null;
  const m = String(slug).trim().match(/^([\w.-]+)\/([\w.-]+)$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

/**
 * Fetch recent issues + PRs from the GitHub REST API. Unauthenticated public
 * access only; returns [] on any failure so snapshots degrade gracefully.
 */
export async function fetchIssues(
  slug,
  { limit = 200, timeoutMs = 8000 } = {}
) {
  if (!parseRepoSlug(slug)) return [];
  const perPage = 100;
  const pages = Math.ceil(Math.min(limit, 500) / perPage);
  const all = [];
  for (let page = 1; page <= pages; page += 1) {
    try {
      const url =
        `https://api.github.com/repos/${slug}/issues` +
        `?state=all&per_page=${perPage}&page=${page}&sort=created&direction=desc`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: "application/vnd.github+json" },
      });
      if (!res.ok) break;
      const batch = await res.json();
      if (!Array.isArray(batch)) break;
      for (const item of batch) {
        // Pull requests come through this endpoint too — exclude them.
        if (item.pull_request !== undefined) continue;
        all.push({
          number: item.number,
          state: item.state,
          created_at: item.created_at,
          closed_at: item.closed_at ?? null,
          title: item.title,
        });
      }
      if (batch.length < perPage || all.length >= limit) break;
    } catch {
      break; // offline / rate limited -> partial or empty data
    }
  }
  return all.slice(0, limit);
}
