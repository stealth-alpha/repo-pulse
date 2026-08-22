import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  deepMerge,
  escapeXml,
  readJson,
  clamp,
  round,
} from "../src/util.js";

test("deepMerge merges nested plain objects", () => {
  const base = { a: 1, issues: { enabled: true, limit: 200 }, keep: "x" };
  const out = deepMerge(base, { issues: { limit: 50 } });
  assert.deepEqual(out, {
    a: 1,
    issues: { enabled: true, limit: 50 },
    keep: "x",
  });
  // base is not mutated
  assert.equal(base.issues.limit, 200);
});

test("deepMerge replaces arrays and non-object patches wholesale", () => {
  assert.deepEqual(deepMerge({ list: [1, 2] }, { list: [3] }), { list: [3] });
  assert.deepEqual(deepMerge({ a: { b: 1 } }, { a: "scalar" }), { a: "scalar" });
  assert.deepEqual(deepMerge({ a: 1 }, "scalar"), "scalar");
});

test("deepMerge returns base for undefined patch and handles nulls", () => {
  const base = { a: 1 };
  assert.equal(deepMerge(base, undefined), base);
  assert.deepEqual(deepMerge({ a: 1 }, null), null);
  assert.deepEqual(deepMerge({ a: { b: 1 } }, { a: null }), { a: null });
});

function tmpJsonFile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rp-util-"));
  const file = path.join(dir, "cfg.json");
  if (content !== undefined) fs.writeFileSync(file, content);
  return file;
}

test("readJson parses valid files and falls back on errors", () => {
  assert.deepEqual(readJson(tmpJsonFile('{"a":1}'), {}), { a: 1 });
  // invalid JSON
  assert.deepEqual(readJson(tmpJsonFile("{nope"), { fallback: true }), {
    fallback: true,
  });
  // missing file
  assert.equal(readJson(tmpJsonFile(undefined), null), null);
});

test("escapeXml escapes all five XML entities", () => {
  assert.equal(
    escapeXml(`<a href="x">&'y'`),
    "&lt;a href=&quot;x&quot;&gt;&amp;&apos;y&apos;"
  );
  assert.equal(escapeXml(""), "");
  assert.equal(escapeXml(42), "42");
});

test("clamp bounds and round keeps requested precision", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(99, 0, 10), 10);
  assert.equal(round(7.32, 1), 7.3);
  assert.equal(round(7.36, 1), 7.4);
  assert.equal(round(42, 0), 42);
});
