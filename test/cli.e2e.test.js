import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const bin = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "bin",
  "repo-pulse.js"
);

function run(args) {
  return spawnSync(process.execPath, [bin, ...args], {
    encoding: "utf8",
    timeout: 15000,
  });
}

test("--help prints usage without running a snapshot", () => {
  const r = run(["--help"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Usage/);
  assert.doesNotMatch(r.stdout, /repository:/);
});

test("-h still prints usage", () => {
  const r = run(["-h"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Usage/);
});

test("--version prints the version without running a snapshot", () => {
  const r = run(["--version"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+$/);
  assert.doesNotMatch(r.stdout, /repository:/);
});

test("-v still prints the version", () => {
  const r = run(["-v"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test("--weeks with a non-numeric value fails with a friendly message", () => {
  const r = run(["--weeks", "abc", "--offline"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--weeks must be a positive integer/);
  assert.doesNotMatch(r.stderr, /RangeError|at /);
});

test("--stale-months with zero fails with a friendly message", () => {
  const r = run(["--stale-months", "0", "--offline"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--stale-months must be a positive integer/);
});

test("unknown command exits non-zero and shows usage", () => {
  const r = run(["frobnicate"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Unknown command: frobnicate/);
  assert.match(r.stdout, /Usage/);
});
