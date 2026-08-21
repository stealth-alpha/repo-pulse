import test from "node:test";
import assert from "node:assert/strict";
import { formatText, formatJson } from "../src/format.js";
import { buildSnapshot } from "../src/health.js";
import { commitAt } from "../test-support/helpers.js";

const NOW = Date.UTC(2026, 7, 21);

test("formatText renders every metric section", () => {
  const snapshot = buildSnapshot(
    {
      commits: [commitAt(0, "Ada", "ada@x.dev", NOW), commitAt(2, "Bob", "bob@x.dev", NOW)],
      deps: [{ name: "left-pad", version: "1.0.0" }],
      publishTimes: { "left-pad": "2016-01-01T00:00:00Z" },
      issues: null,
    },
    { now: NOW }
  );
  snapshot.repo = { name: "demo", branch: "main", head: { hash: "abc1234", date: "x" }, github: null };
  const text = formatText(snapshot);
  assert.match(text, /repo-pulse/);
  assert.match(text, /commit velocity/);
  assert.match(text, /bus factor/);
  assert.match(text, /stale deps/);
  assert.match(text, /left-pad@1\.0\.0/);
  assert.match(text, /issue half-life : skipped/);
  assert.match(text, /score/);
});

test("formatJson emits parseable JSON with stable top-level keys", () => {
  const snapshot = buildSnapshot(
    { commits: [commitAt(0)], deps: [], publishTimes: {}, issues: null },
    { now: NOW }
  );
  const parsed = JSON.parse(formatJson(snapshot));
  assert.deepEqual(Object.keys(parsed).sort(), ["generatedAt", "metrics", "scores"]);
});
