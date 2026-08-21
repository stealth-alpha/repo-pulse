import { dim, bold } from "./util.js";

/**
 * Human-readable snapshot summary.
 */
export function formatText(snapshot, opts = {}) {
  const m = snapshot.metrics;
  const s = snapshot.scores;
  const lines = [];
  const repo = snapshot.repo || {};

  lines.push(`${bold("repo-pulse")} — repository health snapshot`);
  if (repo.name) lines.push(`repository: ${repo.name}${repo.branch ? ` (${repo.branch})` : ""}`);
  if (repo.head) lines.push(`head: ${repo.head.hash} @ ${repo.head.date}`);
  lines.push("");

  if (m.velocity) {
    lines.push(
      `commit velocity : ${m.velocity.average}/week avg over ${m.velocity.weeks}w ` +
        `(trend ${m.velocity.trend}, last ${m.velocity.current}, prev ${m.velocity.previous})`
    );
  }
  if (m.busFactor) {
    const bf = m.busFactor;
    const topNames = bf.top
      .slice(0, 3)
      .map((c) => `${c.name} (${Math.round(c.share * 100)}%)`)
      .join(", ");
    lines.push(
      `bus factor      : ${bf.score} (${bf.risk}) across ${bf.contributors} contributors` +
        (topNames ? ` — top: ${topNames}` : "")
    );
  }
  if (m.staleDeps) {
    const sd = m.staleDeps;
    lines.push(
      `stale deps      : ${sd.stale.length}/${sd.checked} older than ${sd.maxAgeMonths}m` +
        (sd.unknown ? ` (${sd.unknown} unknown)` : "")
    );
    for (const dep of sd.stale.slice(0, 5)) {
      lines.push(
        `  • ${dep.name}@${dep.version} — last publish ${dep.lastPublish.slice(0, 10)} (${dep.ageDays}d ago)`
      );
    }
    if (sd.stale.length > 5) {
      lines.push(dim(`  … and ${sd.stale.length - 5} more`));
    }
  }
  if (m.issueHalfLife === null) {
    lines.push(`issue half-life : skipped (offline or no GitHub repo detected)`);
  } else {
    const hl = m.issueHalfLife;
    lines.push(
      `issue half-life : ${
        hl.halfLifeDays === null
          ? "no closed issues in sample"
          : `${hl.halfLifeDays} days median time-to-close`
      } (${hl.open} open / ${hl.closed} closed)`
    );
  }

  lines.push("");
  const comp = s.components;
  const fmt = (v) => (v === null ? "n/a" : String(v));
  lines.push(
    `score           : ${s.overall ?? "n/a"}/100 (grade ${s.grade})` +
      ` [velocity ${fmt(comp.velocity)}, bus ${fmt(comp.busFactor)}, deps ${fmt(comp.deps)}, issues ${fmt(comp.issues)}]`
  );
  lines.push(dim(`generated: ${snapshot.generatedAt}`));
  return lines.join("\n");
}

/** Pretty JSON output. */
export function formatJson(snapshot, { pretty = true } = {}) {
  return JSON.stringify(snapshot, null, pretty ? 2 : 0);
}
