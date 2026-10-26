import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { BOOKS } from "./books.ts";
import { CAST, castOf, GUIDE } from "./cast.ts";
import { WORDS } from "./words.ts";

describe("등장인물", () => {
  it("인물도 이름 그대로 — 주인공 넷, 조연 셋, 안내는 페파", () => {
    assert.deepEqual(
      CAST.filter((c) => c.role === "주인공").map((c) => c.name),
      ["페파", "조지", "아빠", "엄마"],
    );
    assert.deepEqual(
      CAST.filter((c) => c.role === "조연").map((c) => c.name),
      ["할아버지", "할머니", "토끼"],
    );
    assert.equal(GUIDE.name, "페파");
  });

  it("인물과 같은 이름의 낱말은 낱말 목록에 있다", () => {
    const words = new Set(WORDS.map((w) => w.text));
    for (const c of CAST) if (c.word) assert.ok(words.has(c.word), c.name);
  });

  it("책에 적은 인물은 모두 등장인물에 있다", () => {
    for (const b of BOOKS) for (const id of b.cast ?? []) assert.ok(castOf(id), `${b.id}: ${id}`);
  });
});
