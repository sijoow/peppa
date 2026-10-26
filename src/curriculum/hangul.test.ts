import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { compose, decompose, isHangulWord, syllableGrid, vowelSide } from "./hangul.ts";

describe("한글 글자 조합", () => {
  it("자음 + 모음 (+ 받침) → 글자", () => {
    assert.equal(compose("ㄱ", "ㅏ"), "가");
    assert.equal(compose("ㅎ", "ㅣ"), "히");
    assert.equal(compose("ㄱ", "ㅗ", "ㅁ"), "곰");
    assert.equal(compose("ㄷ", "ㅏ", "ㄺ"), "닭");
    assert.equal(compose("ㅏ", "ㄱ"), null, "순서가 틀리면 null");
  });

  it("글자 → 자모", () => {
    assert.deepEqual(decompose("닭"), { cho: "ㄷ", jung: "ㅏ", jong: "ㄺ" });
    assert.deepEqual(decompose("우"), { cho: "ㅇ", jung: "ㅜ", jong: "" });
    assert.equal(decompose("ㄱ"), null);
  });

  it("모음 붙는 자리", () => {
    assert.equal(vowelSide("ㅏ"), "right");
    assert.equal(vowelSide("ㅗ"), "below");
    assert.equal(vowelSide("ㅘ"), "both");
  });

  it("받침 없는 글자 표", () => {
    assert.deepEqual(syllableGrid(["ㄱ", "ㄴ"], ["ㅏ", "ㅗ"]), ["가", "고", "나", "노"]);
    assert.ok(isHangulWord("사과"));
    assert.ok(!isHangulWord("사 과"));
    assert.ok(!isHangulWord("ㄱ"));
  });
});
