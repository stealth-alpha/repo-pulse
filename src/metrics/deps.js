import { readJson } from "../util.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Merge `dependencies` and `devDependencies` from a parsed package.json.
 * @returns {Array<{name: string, version: string, dev: boolean}>}
 */
export function collectDeps(packageJson) {
  const deps = [];
  if (!packageJson || typeof packageJson !== "object") return deps;
  for (const [name, version] of Object.entries(
    packageJson.dependencies || {}
  )) {
    deps.push({ name, version: String(version), dev: false });
  }
  for (const [name, version] of Object.entries(
    packageJson.devDependencies || {}
  )) {
    deps.push({ name, version: String(version), dev: true });
  }
  return deps;
}

/** Read dependencies from a package.json file on disk. */
export function loadDeps(packageJsonPath) {
  return collectDeps(readJson(packageJsonPath));
}

/**
 * Pure staleness check. A dependency is stale when its last publish is older
 * than `maxAgeMonths` months. Unknown publish times are reported separately.
 *
 * @param {Array<{name: string, version: string}>} deps
 * @param {Record<string, string>} publishTimes  name -> ISO timestamp
 * @param {{now?: Date|number, maxAgeMonths?: number}} opts
 */
export function findStaleDeps(deps, publishTimes, opts = {}) {
  const { now = Date.now(), maxAgeMonths = 12 } = opts;
  const nowMs = now instanceof Date ? now.getTime() : now;
  const cutoff = nowMs - maxAgeMonths * 30 * DAY_MS;

  const results = [];
  for (const dep of deps || []) {
    const iso = (publishTimes || {})[dep.name];
    if (!iso) continue; // unknown -> excluded, surfaced via `unknown`
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) continue;
    results.push({
      name: dep.name,
      version: dep.version,
      lastPublish: new Date(t).toISOString(),
      ageDays: Math.floor((nowMs - t) / DAY_MS),
      stale: t < cutoff,
    });
  }
  results.sort((a, b) => b.ageDays - a.ageDays);

  const unknown = Math.max(0, (deps?.length ?? 0) - results.length);

  return {
    checked: deps?.length ?? 0,
    unknown,
    stale: results.filter((d) => d.stale),
    all: results,
    maxAgeMonths,
  };
}

/** Score 0..100 from stale-dependency share (null when nothing checkable). */
export function staleDepsScore(staleReport) {
  if (!staleReport || staleReport.checked === 0) return null;
  const ratio = staleReport.stale.length / staleReport.checked;
  return Math.round((1 - ratio) * 100);
}

/**
 * Fetch last-publish times from the npm registry (Node 18 global fetch).
 * Returns { name: isoTimestamp } for every dependency we could resolve.
 */
export async function fetchPublishTimes(deps, { timeoutMs = 8000 } = {}) {
  const out = {};
  for (const dep of deps || []) {
    try {
      const res = await fetch(
        `https://registry.npmjs.org/${encodeURIComponent(dep.name)}`,
        {
          signal: AbortSignal.timeout(timeoutMs),
          headers: { accept: "application/vnd.npm.install-v1+json" },
        }
      );
      if (!res.ok) continue;
      const body = await res.json();
      const iso =
        body?.time?.modified ||
        body?.time?.[body?.["dist-tags"]?.latest] ||
        null;
      if (iso) out[dep.name] = iso;
    } catch {
      // Network problem / scoped-without-access / offline: skip quietly.
    }
  }
  return out;
}
