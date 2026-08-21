import test from "node:test";
import assert from "node:assert/strict";
import { busFactor, busFactorScore } from "../src/metrics/busfactor.js";

function commitsFromShares(shares) {
  const out = [];
  let i = 0;
  for (const [name, count] of shares) {
    for (let k = 0; k < count; k++) {
      out.push({ author: name, email: `${name.toLowerCase()}@x.dev`, key: i++ });
    }
  }
  return out;
}

test("busFactor is 1 for a single-maintainer repo", () => {
  const bf = busFactor(commitsFromShares([["Ada", 10]]));
  assert.equal(bf.score, 1);
  assert.equal(bf.contributors, 1);
  assert.equal(bf.risk, "critical");
  assert.equal(bf.top[0].share, 1);
});

test("busFactor counts people needed to cover half the work", () => {
  // Ada 40%, Bob 30%, Cara 30% -> two people needed to reach >=50%.
  const bf = busFactor(
    commitsFromShares([
      ["Ada", 40],
      ["Bob", 30],
      ["Cara", 30],
    ])
  );
  assert.equal(bf.score, 2);
  assert.equal(bf.risk, "low");
});

test("busFactor is healthy when knowledge is spread", () => {
  const bf = busFactor(
    commitsFromShares([
      ["A", 25],
      ["B", 25],
      ["C", 25],
      ["D", 25],
    ])
  );
  assert.equal(bf.score, 2); // A+B = 50% exactly
  assert.equal(bf.risk, "low");
});

test("busFactor handles empty history", () => {
  const bf = busFactor([]);
  assert.equal(bf.score, 0);
  assert.deepEqual(bf.top, []);
});

test("busFactorScore maps to the documented scale", () => {
  assert.equal(busFactorScore({ score: 1, contributors: 1 }), 15);
  assert.equal(busFactorScore({ score: 2, contributors: 3 }), 50);
  assert.equal(busFactorScore({ score: 3, contributors: 5 }), 80);
  assert.equal(busFactorScore({ score: 6, contributors: 9 }), 100);
});
