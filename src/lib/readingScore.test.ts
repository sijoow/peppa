import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { hangulOnly, scoreReading, similarity } from "./readingScore.ts";

describe("읽기 코칭 판정", () => {
  it("한글만 비교 — 띄어쓰기·문장부호는 상관없다", () => {
    assert.equal(hangulOnly("사과 하나 쏙!"), "사과하나쏙");
    assert.equal(similarity("사과 하나 쏙!", "사과하나 쏙"), 1);
  });

  it("조금 틀리게 들려도 통과, 많이 다르면 다시", () => {
    assert.ok(scoreReading("토끼가 장을 봐요.", ["토끼가 장을 바요"]).pass);
    assert.equal(scoreReading("토끼가 장을 봐요.", ["고양이"]).pass, false);
    assert.equal(scoreReading("사과", []).pass, false);
  });

  it("후보 여러 개 중 가장 닮은 것으로, 못 읽은 낱말을 알려 준다", () => {
    const r = scoreReading("엄마 아빠 다녀오겠습니다", ["엄마 바빠", "엄마 아빠"]);
    assert.deepEqual(r.missing, ["다녀오겠습니다"]);
  });
});
