import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { missingBooks, unitDays, BUILT_UNITS } from "./days.ts";
import { emojiOf, isKnownItem, isLetter } from "./items.ts";
import { STAGES, UNITS } from "./outline.ts";
import { isScored } from "../lib/rounds.ts";

describe("전체 과정표 — 토도한글과 같은 틀", () => {
  it("6단계 · 14단원 · 54장 · 기본 270일", () => {
    assert.equal(STAGES.length, 6);
    assert.equal(UNITS.length, 14);
    assert.equal(
      UNITS.reduce((n, u) => n + u.chapters.length, 0),
      54,
    );
    assert.equal(
      UNITS.reduce((n, u) => n + u.days, 0),
      270,
    );
  });

  it("장 하나는 5일, 단원 번호는 1~14 차례로", () => {
    UNITS.forEach((u, i) => {
      assert.equal(u.id, i + 1);
      assert.equal(u.days, u.chapters.length * 5, `${u.id}단원`);
      assert.ok(STAGES.some((s) => s.id === u.stage));
    });
  });
});

describe("1단계 하루치 (1~2단원)", () => {
  const all = BUILT_UNITS.flatMap((u) => unitDays(u));

  it("1단원 10일 + 2단원 20일", () => {
    assert.deepEqual(BUILT_UNITS, [1, 2]);
    assert.equal(unitDays(1).length, 10);
    assert.equal(unitDays(2).length, 20);
  });

  it("하루 = 활동 5개 + 마지막에 오늘의 책 1권", () => {
    for (const d of all) {
      const books = d.activities.filter((a) => a.kind === "book");
      assert.equal(books.length, 1, `${d.unit}-${d.day}`);
      assert.equal(d.activities.at(-1)?.kind, "book", `${d.unit}-${d.day}`);
      assert.equal(d.activities.length - 1, 5, `${d.unit}-${d.day}`);
    }
  });

  it("5일째마다 형성 평가 — 그날은 점수 활동만", () => {
    for (const d of all) {
      assert.equal(d.assess, d.day % 5 === 0, `${d.unit}-${d.day}`);
      if (!d.assess) continue;
      for (const a of d.activities) {
        if (a.kind !== "book") assert.ok(isScored(a.kind), `${d.unit}-${d.day} ${a.kind}`);
      }
    }
  });

  it("모든 글자·낱말이 사전에 있고, 보기 모음에 정답이 들어 있다", () => {
    for (const d of all) {
      for (const a of d.activities) {
        if (!("items" in a)) continue;
        for (const item of a.items) assert.ok(isKnownItem(item), `${d.unit}-${d.day} ${a.kind} ${item}`);
        if ("pool" in a) {
          assert.ok(new Set(a.pool).size >= 3, `${d.unit}-${d.day} ${a.kind} 보기가 모자람`);
          for (const item of a.items) assert.ok(a.pool.includes(item), `${d.unit}-${d.day} ${a.kind} ${item} 이 pool 에 없음`);
        }
      }
    }
  });

  it("그림이 필요한 활동(그림 찾기·짝짝·낱말 쏙쏙)은 낱말마다 그림이 있다", () => {
    for (const d of all) {
      for (const a of d.activities) {
        if (a.kind === "word-picture" || a.kind === "clap") {
          for (const w of a.items) assert.ok(emojiOf(w), `${d.unit}-${d.day} ${a.kind} ${w}`);
        }
        if (a.kind === "drag-match") {
          const letters = a.items.filter(isLetter).length;
          assert.ok(letters === 0 || letters === a.items.length, `${d.unit}-${d.day} 글자·낱말이 섞임`);
          if (letters === 0) for (const w of a.items) assert.ok(emojiOf(w), `${d.unit}-${d.day} ${w}`);
        }
      }
    }
  });

  it("오늘의 책이 다 있다", () => {
    assert.deepEqual(missingBooks(), []);
  });
});
