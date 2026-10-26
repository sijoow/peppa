import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { BUILT_UNITS, unitDays } from "../curriculum/days.ts";
import { buildSession, choicesFor, seededRng, shuffle } from "./rounds.ts";

describe("판 만들기", () => {
  it("보기에는 정답이 하나, 겹치지 않게", () => {
    const rng = seededRng(7);
    for (let i = 0; i < 50; i++) {
      const c = choicesFor("ㄱ", ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㄴ"], 3, rng);
      assert.equal(c.length, 3);
      assert.equal(new Set(c).size, 3);
      assert.ok(c.includes("ㄱ"));
    }
    assert.equal(choicesFor("ㄱ", ["ㄱ", "ㄴ"], 4, rng).length, 2, "모자라면 있는 만큼");
  });

  it("씨앗이 같으면 같은 순서", () => {
    const a = shuffle([1, 2, 3, 4, 5, 6], seededRng(3));
    const b = shuffle([1, 2, 3, 4, 5, 6], seededRng(3));
    assert.deepEqual(a, b);
  });

  it("1단계 30일 모든 판이 만들어지고 모양이 맞다", () => {
    for (const seed of [1, 2, 3]) {
      const rng = seededRng(seed);
      for (const plan of BUILT_UNITS.flatMap((u) => unitDays(u))) {
        const built = buildSession(plan, rng);
        assert.equal(built.length, plan.activities.length);
        for (const b of built) {
          const where = `${plan.unit}-${plan.day} ${b.kind}`;
          if (b.kind === "listen-choose" || b.kind === "word-picture" || b.kind === "find-same") {
            assert.ok(b.rounds.length > 0, where);
            for (const r of b.rounds) {
              assert.ok(r.choices.includes(r.target), where);
              assert.ok(r.choices.length >= 3, where);
            }
          }
          if (b.kind === "drag-match") {
            for (const s of b.screens) {
              assert.ok(s.targets.length >= 1 && s.targets.length <= 3, where);
              assert.deepEqual([...s.targets].sort(), [...s.tokens].sort(), where);
              if (s.targets.length > 1) assert.notDeepEqual(s.tokens, s.targets, `${where} 카드가 자리 바로 아래 같은 순서`);
            }
          }
          if (b.kind === "tap-pop") {
            for (const p of b.bubbles) {
              assert.ok(p.x >= 10 && p.x <= 90 && p.y >= 15 && p.y <= 85, where);
            }
          }
          if (b.kind === "clap") {
            for (const r of b.rounds) assert.equal(r.syllables.join(""), r.word, where);
          }
        }
      }
    }
  });
});
