import test from "node:test";
import assert from "node:assert/strict";
import { commitVelocity, velocityScore, weekStart } from "../src/metrics/velocity.js";
import { commitAt } from "../test-support/helpers.js";

const NOW = Date.UTC(2026, 7, 21, 12, 0, 0); // Friday

test("commitVelocity buckets commits into trailing weeks", () => {
  const commits = [
    commitAt(1, "A", "a@x.dev", NOW), // this week
    commitAt(2, "A", "a@x.dev", NOW), // last week too
    commitAt(8, "B", "b@x.dev", NOW), // two weeks back
    commitAt(100, "C", "c@x.dev", NOW), // outside window
  ];
  const v = commitVelocity(commits, { weeks: 4, now: NOW });
  assert.equal(v.weeks, 4);
  assert.equal(v.total, 3);
  assert.equal(v.average, 0.8);
  // newest bucket first
  assert.equal(v.perWeek[3], 2);
  assert.equal(v.perWeek[1] + v.perWeek[2], 1);
  assert.equal(v.perWeek[0], 0);
});

test("commitVelocity detects up/flat trends", () => {
  const recent = [0, 1, 2, 3, 10, 11, 12, 13].map((d) => commitAt(d));
  const old = [30, 31, 32, 33].map((d) => commitAt(d));
  const v = commitVelocity([...recent, ...old], { weeks: 6, now: Date.now() });
  assert.equal(v.trend, "up");
  const flat = commitVelocity([commitAt(1)], { weeks: 2, now: Date.now() });
  assert.ok(["flat", "up"].includes(flat.trend));
});

test("commitVelocity handles empty history", () => {
  const v = commitVelocity([], { weeks: 12 });
  assert.equal(v.total, 0);
  assert.equal(v.trend, "flat");
  assert.deepEqual(v.perWeek, new Array(12).fill(0));
});

test("weekStart aligns to Monday UTC", () => {
  // 2026-08-19 is a Wednesday; its week starts Mon 2026-08-17.
  const wed = Date.UTC(2026, 7, 19, 15, 0, 0);
  assert.equal(weekStart(wed), Date.UTC(2026, 7, 17));
});

test("velocityScore saturates at 5+ commits/week", () => {
  assert.equal(velocityScore({ average: 0 }), 0);
  assert.equal(velocityScore({ average: 2.5 }), 50);
  assert.equal(velocityScore({ average: 5 }), 100);
  assert.equal(velocityScore({ average: 20 }), 100);
});
