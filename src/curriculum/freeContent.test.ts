import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildFreeGame } from "./freeContent.ts";
import { decompose } from "./hangul.ts";
import { learnedAt, PREVIEW } from "./learned.ts";
import { FREE_GAMES } from "./modes.ts";
import { emojiOf } from "./items.ts";
import { EXPLAIN, FIND_ME, READ_ANSWER } from "./reading.ts";
import { seededRng } from "../lib/rounds.ts";

describe("배운 만큼", () => {
  it("1단원 6일째까지는 이름을 배운 글자가 없고, 7일째부터 ㄱㄴㄷㄹ", () => {
    assert.deepEqual(learnedAt(1, 6).consonants, []);
    assert.deepEqual(learnedAt(1, 7).consonants, ["ㄱ", "ㄴ", "ㄷ", "ㄹ"]);
  });

  it("2단원 2일째에 과일 낱말 셋, 3단원부터 1단계 전부, 받침 없는 글자는 4단원 11일부터", () => {
    assert.deepEqual(learnedAt(2, 2).words, ["사과", "바나나", "포도"]);
    assert.equal(learnedAt(3, 1).consonants.length, 14);
    assert.deepEqual(learnedAt(4, 10).syllables, []);
    assert.ok(learnedAt(4, 11).syllables.includes("가"));
  });
});

describe("자유 모드 놀이판 15종", () => {
  const stages = [learnedAt(1, 1), learnedAt(1, 8), learnedAt(2, 12), learnedAt(5, 1), PREVIEW];

  it("어느 진도에서든 15종 모두 판이 만들어지고 모양이 맞다", () => {
    assert.equal(FREE_GAMES.length, 15);
    for (const [si, l] of stages.entries()) {
      const rng = seededRng(si + 1);
      for (const g of FREE_GAMES) {
        const b = buildFreeGame(g.id, l, rng);
        const where = `${g.id} @${si}`;
        switch (b.kind) {
          case "pick":
            assert.ok(b.rounds.length >= 3, where);
            for (const r of b.rounds) assert.ok(r.choices.includes(r.answer) && new Set(r.choices).size === r.choices.length, where);
            break;
          case "listen":
            for (const r of b.rounds) assert.ok(r.choices.includes(r.target), where);
            break;
          case "trace":
          case "word-card":
            assert.ok(b.items.length >= 3, where);
            break;
          case "pieces":
            for (const r of b.rounds) {
              assert.deepEqual([...r.tiles].sort(), [...r.word].sort(), where);
              assert.notEqual(r.tiles.join(""), r.word, `${where} 처음부터 맞는 순서`);
            }
            break;
          case "wheel":
          case "assemble":
          case "cauldron":
            for (const r of b.rounds) {
              const d = decompose(r.target);
              assert.ok(d && r.consonants.includes(d.cho) && r.vowels.includes(d.jung), `${where} ${r.target}`);
            }
            break;
          case "rhythm":
            assert.ok(b.notes.length >= 4, where);
            break;
          case "read":
            for (const r of b.rounds) assert.ok(r.choices.includes(r.answer), where);
            break;
        }
      }
    }
  });

  it("말소리 정류장 — 정답은 들려준 글자의 첫 자음", () => {
    const b = buildFreeGame("sound-station", learnedAt(5, 1), seededRng(9));
    assert.equal(b.kind, "pick");
    if (b.kind === "pick") for (const r of b.rounds) assert.equal(decompose(r.say)?.cho, r.answer);
  });

  it("읽기 이해 글 — 정답이 보기에 있고, 설명해 주세요 보기는 모두 그림이 있다", () => {
    for (const r of [...EXPLAIN, ...FIND_ME, ...READ_ANSWER]) assert.ok(r.choices.includes(r.answer), r.text);
    for (const r of EXPLAIN) for (const c of r.choices) assert.ok(emojiOf(c), `${r.text} ${c}`);
  });
});
