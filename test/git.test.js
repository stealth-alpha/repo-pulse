import test from "node:test";
import assert from "node:assert/strict";
import {
  parseLog,
  parseGithubRemote,
  getRemoteUrl,
  getBranch,
} from "../src/git.js";
import { makeGitRepo, removeDir } from "../test-support/helpers.js";

const SEP = "\x1e";
const FS = "\x1f";

test("parseLog reconstructs commit objects from raw git output", () => {
  const raw = [
    `${SEP}abc123${FS}abc123${FS}Ada${FS}ada@x.dev${FS}2026-08-01T00:00:00Z${FS}feat: first`,
    `${SEP}def456${FS}def456${FS}Bob${FS}bob@x.dev${FS}2026-08-02T00:00:00Z${FS}fix: second`,
  ].join("\n");
  const commits = parseLog(raw);
  assert.equal(commits.length, 2);
  assert.equal(commits[0].author, "Ada");
  assert.equal(commits[1].subject, "fix: second");
});

test("parseLog skips malformed records", () => {
  const raw = `${SEP}only${FS}three${FS}fields`;
  assert.deepEqual(parseLog(raw), []);
});

test("parseGithubRemote handles https, ssh and plain slugs", () => {
  assert.equal(
    parseGithubRemote("https://github.com/acme/widgets.git"),
    "acme/widgets"
  );
  assert.equal(
    parseGithubRemote("git@github.com:acme/widgets.git"),
    "acme/widgets"
  );
  assert.equal(parseGithubRemote("acme/widgets"), "acme/widgets");
  assert.equal(parseGithubRemote("https://gitlab.com/acme/widgets.git"), null);
  assert.equal(parseGithubRemote(null), null);
});

test("getBranch and getRemoteUrl read from a real repo", () => {
  const dir = makeGitRepo([{ message: "init" }]);
  try {
    // Fresh init defaults to a branch; any non-empty name is fine.
    const branch = getBranch(dir);
    assert.ok(typeof branch === "string");
    assert.equal(getRemoteUrl(dir), null);
  } finally {
    removeDir(dir);
  }
});
