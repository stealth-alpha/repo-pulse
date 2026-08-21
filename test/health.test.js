import test from "node:test";
import assert from "node:assert/strict";
import { buildSnapshot, gradeFor, healthColor } from "../src/health.js";
import { commitAt } from "../test-support/helpers.js";

const NOW = Date.UTC(2026, 7, 21);

test("buildSnapshot scores stay within 0..100 and produce a grade", () => {
  const commits = [];
  for (let d = 0; d < 60; d++) commits.push(commitAt(d, "Ada", "ada@x.dev", NOW));
  const snapshot = buildSnapshot(
    { commits, deps: [], publishTimes: {}, issues: [] },
    { now: NOW }
  );
  assert.ok(snapshot.scores.overall >= 0 && snapshot.scores.overall <= 100);
  assert.match(snapshot.scores.grade, /^[A-F]$/);
  assert.equal(snapshot.metrics.issueHalfLife.halfLifeDays, null);
});

test("buildSnapshot renormalizes when issue data is unavailable (offline)", () => {
  const commits = [];
  for (let d = 0; d < 30; d++) commits.push(commitAt(d));
  const withIssues = buildSnapshot(
    {
      commits,
      deps: [],
      publishTimes: {},
      issues: [
        { state: "closed", created_at: "2026-08-01T00:00:00Z", closed_at: "2026-08-02T00:00:00Z" },
      ],
    },
    { now: NOW }
  );
  const offline = buildSnapshot(
    { commits, deps: [], publishTimes: {}, issues: null },
    { now: NOW }
  );
  // Both must still yield a valid overall score.
  assert.ok(offline.scores.overall !== null);
  assert.equal(offline.scores.components.issues, null);
  assert.ok(withIssues.scores.overall >= offline.scores.overall - 40);
});

test("gradeFor maps score bands deterministically", () => {
  assert.equal(gradeFor(null), "?");
  assert.equal(gradeFor(95), "A");
  assert.equal(gradeFor(80), "B");
  assert.equal(gradeFor(65), "C");
  assert.equal(gradeFor(45), "D");
  assert.equal(gradeFor(10), "F");
});

test("healthColor maps score bands to badge colors", () => {
  assert.equal(healthColor(null), "lightgrey");
  assert.equal(healthColor(95), "brightgreen");
  assert.equal(healthColor(80), "green");
  assert.equal(healthColor(65), "yellowgreen");
  assert.equal(healthColor(45), "orange");
  assert.equal(healthColor(5), "red");
});
