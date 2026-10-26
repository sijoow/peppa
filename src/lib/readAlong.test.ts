import assert from "node:assert/strict";
import { test } from "node:test";
import { charTimes, litCount } from "./readAlong.ts";

const GREET = "안녕! 나는 페파야. 오늘도 같이 한글 놀이 하자!";
// 실제 수아 음성(scripts/voice-timing.mts 로 잰 값)
const GREET_SEGS = [
  [0.2, 0.67],
  [1.06, 2],
  [2.18, 3.89],
];

test("문장부호 조각마다 그 말소리 구간에 글자가 들어간다", () => {
  const t = charTimes(GREET, GREET_SEGS);
  const at = (s: string) => t[[...GREET].indexOf(s)];
  assert.ok(at("안") >= 0.2 && at("녕") < 0.67);
  assert.ok(at("나") >= 1.06 && at("야") < 2);
  assert.ok(at("오") >= 2.18 && at("자") < 3.89);
});

test("띄어쓰기·문장부호는 앞 글자와 같이 바뀐다", () => {
  const t = charTimes(GREET, GREET_SEGS);
  const chars = [...GREET];
  assert.equal(t[chars.indexOf("!")], t[chars.indexOf("녕")]);
  assert.equal(t[chars.indexOf(" ")], t[chars.indexOf("녕")]);
});

test("시각은 앞에서 뒤로만 간다 — 칠한 글자 수도 줄지 않는다", () => {
  const t = charTimes(GREET, GREET_SEGS);
  for (let i = 1; i < t.length; i++) assert.ok(t[i] >= t[i - 1]);
  let last = 0;
  for (let s = 0; s <= 4.2; s += 0.05) {
    const n = litCount(t, s);
    assert.ok(n >= last);
    last = n;
  }
  assert.equal(litCount(t, 0), 0);
  assert.equal(litCount(t, 4.2), [...GREET].length);
});

test("쉬는 곳이 더 많으면 사이가 짧은 구간끼리 합친다", () => {
  const t = charTimes("토끼가 장을 봐요.", [
    [0.1, 0.5],
    [0.55, 0.9],
    [1.3, 1.6],
  ]);
  assert.ok(t[0] >= 0.1 && t[t.length - 1] < 1.6);
});

test("쉬는 곳이 더 적으면 말소리 시간에 고르게 — 쉬는 동안은 멈춘다", () => {
  const text = "하나, 둘, 셋.";
  const t = charTimes(text, [
    [0, 1],
    [2, 3],
  ]);
  // 소리 글자 4개(하·나·둘·셋)를 말소리 2초에 0.5초씩 — 셋째부터는 둘째 구간(2초~)으로 건너뛴다
  const chars = [...text];
  assert.ok(t[chars.indexOf("나")] < 1);
  assert.ok(t[chars.indexOf("둘")] >= 2 && t[chars.indexOf("셋")] >= 2);
  assert.ok(t.every((x) => x < 1 || x >= 2));
});

test("구간 자료가 없으면(기기 음성) 어림한 길이에 고르게", () => {
  const t = charTimes("바나나", null, 0.9);
  assert.ok(t[0] < 0.3 && t[1] >= 0.3 && t[2] >= 0.6 && t[2] < 0.9);
});
