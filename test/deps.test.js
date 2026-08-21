import test from "node:test";
import assert from "node:assert/strict";
import {
  collectDeps,
  findStaleDeps,
  staleDepsScore,
  fetchPublishTimes,
} from "../src/metrics/deps.js";

const NOW = Date.UTC(2026, 7, 21);

test("collectDeps merges runtime and dev dependencies", () => {
  const deps = collectDeps({
    dependencies: { left: "^1.0.0" },
    devDependencies: { right: "^2.0.0" },
  });
  assert.equal(deps.length, 2);
  const byName = Object.fromEntries(deps.map((d) => [d.name, d]));
  assert.equal(byName.left.dev, false);
  assert.equal(byName.right.dev, true);
  assert.equal(byName.right.version, "^2.0.0");
});

test("findStaleDeps flags deps unpublished beyond the threshold", () => {
  const deps = [
    { name: "fresh", version: "1.0.0" },
    { name: "stale", version: "0.9.0" },
    { name: "ancient", version: "0.1.0" },
    { name: "unknown", version: "2.0.0" },
  ];
  const times = {
    fresh: "2026-08-01T00:00:00Z",
    stale: "2025-06-01T00:00:00Z", // ~14 months before NOW
    ancient: "2020-01-01T00:00:00Z",
  };
  const report = findStaleDeps(deps, times, { now: NOW, maxAgeMonths: 12 });
  assert.equal(report.checked, 4);
  assert.equal(report.unknown, 1);
  assert.deepEqual(
    report.stale.map((d) => d.name).sort(),
    ["ancient", "stale"]
  );
  assert.ok(report.all[0].ageDays >= report.all.at(-1).ageDays); // sorted oldest first
});

test("staleDepsScore is null with no deps and 100 when all fresh", () => {
  assert.equal(staleDepsScore({ checked: 0, stale: [] }), null);
  assert.equal(staleDepsScore({ checked: 4, stale: [] }), 100);
  assert.equal(staleDepsScore({ checked: 4, stale: [{ name: "x" }, { name: "y" }] }), 50);
});

test("fetchPublishTimes degrades gracefully on network errors", async () => {
  // Point at a name that cannot exist; must resolve (not throw) with {}.
  const times = await fetchPublishTimes(
    [{ name: "definitely-not-a-real-package-ox-2026" }],
    { timeoutMs: 3000 }
  );
  assert.equal(typeof times, "object");
});
