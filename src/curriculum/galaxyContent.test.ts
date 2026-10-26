import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { galaxyQuestion, KEYBOARD } from "./galaxyContent.ts";
import { compose } from "./hangul.ts";
import { learnedAt, PREVIEW } from "./learned.ts";
import { GALAXIES, GALAXY_STAGES, stageRule } from "./modes.ts";
import { seededRng } from "../lib/rounds.ts";

describe("은하계 여행", () => {
  it("은하 6개, 행성 5개, 스테이지마다 목표가 늘어난다", () => {
    assert.equal(GALAXIES.length, 6);
    assert.equal(GALAXY_STAGES, 5);
    const goals = [1, 2, 3, 4, 5].map((s) => stageRule(s).goal);
    assert.deepEqual(goals, [...goals].sort((a, b) => a - b));
  });

  it("자판에 기본 자음 14개와 모음 10개가 다 있다", () => {
    const keys = KEYBOARD.flat();
    for (const k of ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ", "ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"]) assert.ok(keys.includes(k), k);
  });

  it("어느 진도·스테이지에서든 문제가 맞는 모양", () => {
    const rng = seededRng(11);
    for (const l of [learnedAt(1, 1), learnedAt(1, 9), learnedAt(2, 12), learnedAt(5, 1), PREVIEW]) {
      for (const g of GALAXIES) {
        for (let stage = 1; stage <= 5; stage++) {
          for (let i = 0; i < 20; i++) {
            const q = galaxyQuestion(g, stage, l, rng);
            const where = `${g.id} s${stage}`;
            if (g.kind === "type") {
              assert.ok(q.keys && q.keys.length >= 1, where);
              if (g.level === 2) assert.equal(compose(q.keys![0], q.keys![1]), q.answer, where);
            } else {
              assert.ok(q.choices.includes(q.answer), where);
              assert.equal(new Set(q.choices).size, q.choices.length, where);
              assert.ok(q.choices.length >= 3, where);
            }
          }
        }
      }
    }
  });
});
