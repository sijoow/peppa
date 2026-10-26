import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { DIAG_LEVELS, DIAG_TOP_UNIT, diagAnswer, diagItem, diagStart, type DiagState } from "./diagnose.ts";

/** 단계마다 맞힌 수를 정해 두고 끝까지 */
function run(perLevel: boolean[][]): DiagState {
  let s = diagStart();
  for (const answers of perLevel) for (const ok of answers) s = diagAnswer(s, ok);
  return s;
}

describe("단원 찾기 퀴즈", () => {
  it("문제마다 정답이 보기에 있고, 보기는 겹치지 않는다", () => {
    for (const l of DIAG_LEVELS) {
      assert.equal(l.items.length, 5, l.title);
      for (const it of l.items) {
        assert.ok(it.choices.includes(it.answer), `${l.title} ${it.say}`);
        assert.equal(new Set(it.choices).size, it.choices.length, `${l.title} ${it.say}`);
      }
    }
  });

  it("시작 단원은 토도 수준표와 같다 — 1·3·5·7·9, 다 넘으면 12", () => {
    assert.deepEqual(
      DIAG_LEVELS.map((l) => l.unit),
      [1, 3, 5, 7, 9],
    );
    assert.equal(DIAG_TOP_UNIT, 12);
  });

  it("글자 이름을 모르면 두 번 틀리는 순간 1단원으로 끝", () => {
    let s = diagAnswer(diagStart(), false);
    assert.equal(s.result, null);
    s = diagAnswer(s, false);
    assert.equal(s.result, 1);
    assert.equal(diagItem(s), null);
  });

  it("4개 맞히면 다음 단계 — 받침에서 막히면 5단원", () => {
    const s = run([
      [true, true, true, true, false],
      [true, true, true, true, true],
      [true, false, false],
    ]);
    assert.equal(s.result, 5);
  });

  it("다 넘으면 12단원", () => {
    const all = DIAG_LEVELS.map((l) => l.items.map(() => true));
    assert.equal(run(all).result, 12);
  });
});
