import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { bookOf } from "./books.ts";
import { emojiOf, isKnownItem } from "./items.ts";
import { MISSION_GROUPS, MISSIONS } from "./missions.ts";
import { WORDS } from "./words.ts";
import { buildActivity, isScored, seededRng } from "../lib/rounds.ts";

describe("미션 모드 — 토도 미션 88개", () => {
  it("88개, 번호 차례, 9개 묶음, 토도 미션 이름", () => {
    assert.equal(MISSIONS.length, 88);
    MISSIONS.forEach((m, i) => assert.equal(m.id, `m${String(i + 1).padStart(2, "0")}`));
    assert.deepEqual(MISSION_GROUPS, ["디지털 리터러시", "글자 이름", "음운 인식", "통글자", "기본 모음과 자음", "기본 받침", "심화 자음", "심화 모음", "읽기 이해"]);
    const t = (n: number) => MISSIONS[n - 1].title;
    assert.equal(t(1), "튜토리얼");
    assert.equal(t(8), "첫 음절 변별");
    assert.equal(t(15), "통글자 - 옷");
    assert.equal(t(16), "모음 ㅏㅓ ①");
    assert.equal(t(41), "받침 없는 글자 ⑤");
    assert.equal(t(45), "받침 ㅁㅇ ④");
    assert.equal(t(58), "받침 있는 글자 ⑤");
    assert.equal(t(65), "자음 ㅋㅌㅍㅊ");
    assert.equal(t(72), "자음 ㄲㄸㅃㅆㅉ");
    assert.equal(t(82), "모음 ㅔㅐ 발전");
    assert.equal(t(85), "모음 ㅚㅙㅖㅒ 발전");
    assert.equal(t(88), "읽고 이해하기 ③");
  });

  it("미션마다 콘텐츠 2~9개, 퀴즈는 점수 활동", () => {
    for (const m of MISSIONS) {
      assert.ok(m.items.length >= 2 && m.items.length <= 9, `${m.id} ${m.items.length}개`);
      for (const x of m.items) if (x.quiz) assert.ok(isScored(x.spec.kind), `${m.id} 퀴즈 ${x.spec.kind}`);
    }
  });

  it("모든 내용이 맞는 모양 — 글자·낱말이 있고, 그림 놀이는 그림이 있고, 정답이 보기 모음에 있다", () => {
    for (const m of MISSIONS) {
      for (const [i, x] of m.items.entries()) {
        const s = x.spec;
        const where = `${m.id} #${i} ${s.kind}`;
        if (s.kind === "book") {
          assert.ok(bookOf(s.bookId), where);
          continue;
        }
        if (s.kind === "sound-match") {
          for (const r of s.rounds) for (const w of [r.word, r.answer, ...r.others]) assert.ok(emojiOf(w), `${where} ${w}`);
          continue;
        }
        if (s.kind === "read") {
          for (const r of s.rounds) assert.ok(r.choices.includes(r.answer), where);
          continue;
        }
        assert.ok(s.items.length > 0, `${where} 비었음`);
        for (const item of s.items) assert.ok(item && isKnownItem(item), `${where} '${item}'`);
        if ("pool" in s) {
          assert.ok(new Set(s.pool).size >= 3, `${where} 보기가 모자람`);
          for (const item of s.items) assert.ok(s.pool.includes(item), `${where} ${item} 이 pool 에 없음`);
        }
        if (s.kind === "word-picture" || s.kind === "clap" || s.kind === "blend") {
          for (const w of [...s.items, ...("pool" in s ? s.pool : [])]) assert.ok(emojiOf(w), `${where} 그림 없음 ${w}`);
        }
        if (s.kind === "drag-match") {
          const letters = s.items.filter((x) => x.length === 1 && /[ㄱ-ㅣ]/.test(x)).length;
          if (letters === 0) for (const w of s.items) assert.ok(emojiOf(w), `${where} 그림 없음 ${w}`);
        }
      }
    }
  });

  it("88개 모두 판이 만들어진다", () => {
    const rng = seededRng(5);
    for (const m of MISSIONS) for (const x of m.items) assert.ok(buildActivity(x.spec, rng), m.id);
  });

  it("낱말 사전에 같은 낱말이 두 번 없다", () => {
    const texts = WORDS.map((w) => w.text);
    assert.equal(new Set(texts).size, texts.length, texts.filter((t, i) => texts.indexOf(t) !== i).join(","));
  });
});
