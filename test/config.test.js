import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  loadConfig,
  configExists,
  writeDefaultConfig,
  DEFAULT_CONFIG,
} from "../src/config.js";
import { deepMerge } from "../src/util.js";
import { isGitRepo, getCommits } from "../src/git.js";
import { makeGitRepo, removeDir } from "../test-support/helpers.js";
import { buildSnapshot, snapshotBadges } from "../src/index.js";

test("deepMerge keeps defaults for untouched keys and replaces arrays", () => {
  const merged = deepMerge(DEFAULT_CONFIG, {
    weeks: 26,
    issues: { repo: "a/b" },
    badges: { files: ["health"] },
  });
  assert.equal(merged.weeks, 26);
  assert.equal(merged.maxAgeMonths, DEFAULT_CONFIG.maxAgeMonths);
  assert.equal(merged.issues.repo, "a/b");
  assert.equal(merged.issues.enabled, true);
  assert.deepEqual(merged.badges.files, ["health"]);
});

test("config round-trips through disk", () => {
  const dir = makeGitRepo([{ message: "init" }]);
  try {
    assert.equal(configExists(dir), false);
    writeDefaultConfig(dir);
    assert.equal(configExists(dir), true);
    const cfg = loadConfig(dir);
    assert.equal(cfg.weeks, DEFAULT_CONFIG.weeks);
    // Override survives
    fs.writeFileSync(
      path.join(dir, "repo-pulse.config.json"),
      JSON.stringify({ weeks: 4 })
    );
    assert.equal(loadConfig(dir).weeks, 4);
  } finally {
    removeDir(dir);
  }
});

test("end-to-end: real git repo produces a full badge set on disk", () => {
  const commits = [{ message: "init" }];
  for (let d = 1; d <= 20; d++) {
    commits.push({ message: `work ${d}`, daysAgo: d });
  }
  const dir = makeGitRepo(commits);
  const outDir = path.join(dir, ".repo-pulse");
  try {
    assert.equal(isGitRepo(dir), true);
    const snapshot = buildSnapshot(
      { commits: getCommits({ cwd: dir }), deps: [], publishTimes: {}, issues: null },
      {}
    );
    assert.equal(snapshot.repo === undefined || !!snapshot.repo, true);
    assert.ok(snapshot.metrics.velocity.total >= 21);

    fs.mkdirSync(outDir, { recursive: true });
    for (const badge of snapshotBadges(snapshot)) {
      const base = badge.file.replace(/\.json$/, "");
      fs.writeFileSync(path.join(outDir, `${base}.json`), badge.json);
      fs.writeFileSync(path.join(outDir, `${base}.svg`), badge.svg);
      assert.ok(fs.statSync(path.join(outDir, `${base}.svg`)).size > 100);
    }
    assert.ok(fs.existsSync(path.join(outDir, "health.svg")));
  } finally {
    removeDir(dir);
  }
});
