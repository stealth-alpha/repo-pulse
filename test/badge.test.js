import test from "node:test";
import assert from "node:assert/strict";
import { badgeSvg, badgeJson, snapshotBadges } from "../src/badge.js";
import { buildSnapshot } from "../src/health.js";
import { commitAt } from "../test-support/helpers.js";

test("badgeJson matches the shields endpoint schema", () => {
  const b = badgeJson("health", "82/100 B", "green");
  assert.deepEqual(b, {
    schemaVersion: 1,
    label: "health",
    message: "82/100 B",
    color: "green",
  });
});

test("badgeSvg escapes XML-unsafe text", () => {
  const svg = badgeSvg({ label: "deps", message: 'a<b>&"c"', color: "red" });
  assert.ok(svg.includes("&lt;b&gt;&amp;&quot;c&quot;"));
  assert.ok(!svg.includes('a<b>&"c"'));
  assert.match(svg, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="\d+" height="20"/);
});

test("badgeSvg width grows with message length", () => {
  const short = badgeSvg({ label: "x", message: "1", color: "blue" });
  const long = badgeSvg({ label: "x", message: "123456789", color: "blue" });
  const w = (s) => Number(s.match(/width="(\d+)" height/)[1]);
  assert.ok(w(long) > w(short));
});

function fixtureSnapshot() {
  const commits = [];
  for (let d = 0; d < 30; d++) {
    commits.push(commitAt(d, "Ada", "ada@x.dev"));
    if (d % 3 === 0) commits.push(commitAt(d, "Bob", "bob@x.dev"));
  }
  return buildSnapshot(
    {
      commits,
      deps: [{ name: "left", version: "1.0.0" }],
      publishTimes: { left: new Date().toISOString() },
      issues: [
        { state: "closed", created_at: "2026-08-01T00:00:00Z", closed_at: "2026-08-04T00:00:00Z" },
        { state: "open", created_at: "2026-08-10T00:00:00Z", closed_at: null },
      ],
    },
    { now: Date.now() }
  );
}

test("snapshotBadges emits one JSON+SVG pair per metric", () => {
  const badges = snapshotBadges(fixtureSnapshot());
  const files = badges.map((b) => b.file);
  assert.deepEqual(files.sort(), [
    "bus-factor.json",
    "deps.json",
    "health.json",
    "issues.json",
    "velocity.json",
  ]);
  for (const b of badges) {
    assert.equal(JSON.parse(b.json).schemaVersion, 1);
    assert.match(b.svg, /^<svg /);
  }
});

test("snapshotBadges marks missing issue data as unknown", () => {
  const snapshot = buildSnapshot(
    { commits: [commitAt(0)], deps: [], publishTimes: {}, issues: null },
    { now: Date.now() }
  );
  const badges = snapshotBadges(snapshot);
  const issues = badges.find((b) => b.file === "issues.json");
  // No GitHub slug -> no issueHalfLife metric -> badge omitted
  assert.equal(issues, undefined);
});
