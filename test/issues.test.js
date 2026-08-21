import test from "node:test";
import assert from "node:assert/strict";
import {
  issueHalfLife,
  issueHalfLifeScore,
  parseRepoSlug,
  fetchIssues,
} from "../src/metrics/issues.js";

const DAY = 24 * 60 * 60 * 1000;
const NOW = "2026-08-21T00:00:00Z";

function issue(days, state = "closed", offset = 0) {
  const closed = state === "closed";
  return {
    state,
    created_at: new Date(Date.parse(NOW) - days * DAY - offset).toISOString(),
    closed_at: closed ? new Date(Date.parse(NOW) - offset).toISOString() : null,
  };
}

test("issueHalfLife computes median time-to-close (odd sample)", () => {
  const hl = issueHalfLife([issue(2), issue(4), issue(9)]);
  assert.equal(hl.halfLifeDays, 4);
  assert.equal(hl.closed, 3);
});

test("issueHalfLife averages middle pair for even samples", () => {
  const hl = issueHalfLife([issue(2), issue(4), issue(8), issue(10)]);
  assert.equal(hl.halfLifeDays, 6);
});

test("issueHalfLife counts open issues but excludes them from median", () => {
  const hl = issueHalfLife([issue(1), issue(3), issue(20, "open"), issue(40, "open")]);
  assert.equal(hl.open, 2);
  assert.equal(hl.closed, 2);
  assert.equal(hl.halfLifeDays, 2);
});

test("issueHalfLife returns null half-life when nothing closed", () => {
  const hl = issueHalfLife([issue(5, "open")]);
  assert.equal(hl.halfLifeDays, null);
  assert.equal(issueHalfLife([]).halfLifeDays, null);
});

test("issueHalfLifeScore maps <=7 days to 100 and 180 to 0", () => {
  assert.equal(issueHalfLifeScore({ halfLifeDays: 3 }), 100);
  assert.equal(issueHalfLifeScore({ halfLifeDays: 7 }), 100);
  assert.equal(issueHalfLifeScore({ halfLifeDays: 93.5 }), Math.round((1 - (93.5 - 7) / 173) * 100));
  assert.equal(issueHalfLifeScore({ halfLifeDays: null }), null);
  assert.equal(issueHalfLifeScore(null), null);
});

test("parseRepoSlug validates owner/name slugs", () => {
  assert.equal(parseRepoSlug("stealth-alpha/repo-pulse"), "stealth-alpha/repo-pulse");
  assert.equal(parseRepoSlug("not-a-slug"), null);
  assert.equal(parseRepoSlug(null), null);
});

test("fetchIssues returns [] on invalid slug without throwing", async () => {
  assert.deepEqual(await fetchIssues("nope"), []);
});
