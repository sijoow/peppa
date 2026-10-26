import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { completeSession, currentSession, DEFAULT_SETTINGS, initialProgress, logPlay, type Progress, type Settings } from "./progress.ts";
import { addDays, dayDiff, longDate, monthGrid, nickOf, planAhead, shortDate, startDay, streakOf, studyLog, weekdayOf } from "./schedule.ts";

const PERFECT = { correct: 10, total: 10, activities: 6 };
const POOR = { correct: 3, total: 10, activities: 6 };
const WEEKDAYS_ONLY: Settings = { ...DEFAULT_SETTINGS, studyDays: [1, 2, 3, 4, 5] };

/** 그날 오늘의 모험 한 판 */
function play(p: Progress, on: string, r = PERFECT): Progress {
  const ref = currentSession(p);
  assert.ok(ref, "할 판이 있어야 한다");
  return completeSession(p, ref, r, on).next;
}

describe("날짜 계산", () => {
  it("요일·더하기·사이 날 수 — 2026-10-26 은 월요일", () => {
    assert.equal(weekdayOf("2026-10-26"), 1);
    assert.equal(addDays("2026-10-30", 3), "2026-11-02");
    assert.equal(addDays("2026-03-01", -1), "2026-02-28");
    assert.equal(dayDiff("2026-10-15", "2026-10-26"), 11);
    assert.equal(dayDiff("2026-12-31", "2027-01-01"), 1);
    assert.equal(dayDiff("2026-10-26", "2026-10-20"), -6);
    assert.equal(shortDate("2026-10-27"), "10/27(화)");
    assert.equal(longDate("2026-10-15"), "2026년 10월 15일(목)");
  });

  it("달력 — 2026년 10월은 목요일부터, 다섯 주", () => {
    const weeks = monthGrid(2026, 10);
    assert.equal(weeks.length, 5);
    assert.deepEqual(weeks[0], [null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    assert.equal(weeks[4][6], "2026-10-31");
    assert.ok(weeks.every((w) => w.length === 7));
  });

  it("이름 — 받침이 있으면 '이'", () => {
    assert.equal(nickOf("하온"), "하온이");
    assert.equal(nickOf("하온이"), "하온이");
    assert.equal(nickOf("지수"), "지수");
    assert.equal(nickOf("Amy"), "Amy");
  });
});

describe("시작한 날·공부한 날·연속", () => {
  it("시작한 날 — 부모가 정한 날 > 처음 한 날 > 오늘", () => {
    const fresh = initialProgress();
    assert.equal(startDay(fresh, DEFAULT_SETTINGS, "2026-10-26"), "2026-10-26");
    const p = play(fresh, "2026-10-20");
    assert.equal(p.firstOn, "2026-10-20", "처음 한 날이 남는다");
    assert.equal(startDay(play(p, "2026-10-21"), DEFAULT_SETTINGS, "2026-10-26"), "2026-10-20");
    assert.equal(startDay(p, { ...DEFAULT_SETTINGS, startOn: "2026-10-01" }, "2026-10-26"), "2026-10-01");
  });

  it("공부한 날 — 오늘의 모험 날과, 다른 놀이만 한 날", () => {
    let p = play(initialProgress(), "2026-10-20");
    p = logPlay(p, "2026-10-22", { acts: 1, earned: 1 });
    p = logPlay(p, "2026-10-23", { ms: 0, acts: 0, earned: 0 });
    const { adventure, played } = studyLog(p);
    assert.deepEqual([...adventure], ["2026-10-20"]);
    assert.deepEqual([...played].sort(), ["2026-10-20", "2026-10-22"], "아무것도 안 한 칸은 공부한 날이 아니다");
  });

  it("연속 — 오늘 아직 안 했으면 어제까지, 쉬는 요일은 건너뛴다", () => {
    const played = new Set(["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-26"]); // 수·목·금 · (토·일 쉼) · 월
    assert.equal(streakOf(played, "2026-10-26", DEFAULT_SETTINGS.studyDays), 1, "매일 공부면 주말에 끊긴다");
    assert.equal(streakOf(played, "2026-10-26", WEEKDAYS_ONLY.studyDays), 4, "평일만이면 주말을 건너뛴다");
    assert.equal(streakOf(played, "2026-10-27", WEEKDAYS_ONLY.studyDays), 4, "오늘(화) 아직이면 어제까지 센다");
    assert.equal(streakOf(played, "2026-10-28", WEEKDAYS_ONLY.studyDays), 0, "화요일을 건너뛰면 끊긴다");
    assert.equal(streakOf(new Set(), "2026-10-26", DEFAULT_SETTINGS.studyDays), 0);
  });
});

describe("앞으로의 모험", () => {
  it("처음 — 오늘부터 하루씩, 1단원 1일·2일…, 5일째는 확인 놀이", () => {
    const plan = planAhead(initialProgress(), DEFAULT_SETTINGS, "2026-10-26", 7);
    assert.equal(plan.length, 7);
    assert.deepEqual(
      plan.map((d) => [d.on, d.unit, d.day]),
      [
        ["2026-10-26", 1, 1],
        ["2026-10-27", 1, 2],
        ["2026-10-28", 1, 3],
        ["2026-10-29", 1, 4],
        ["2026-10-30", 1, 5],
        ["2026-10-31", 1, 6],
        ["2026-11-01", 1, 7],
      ],
    );
    assert.equal(plan[4].assess, true);
    assert.equal(plan[0].title, "글자 학습 준비 (기기 익히기)");
    assert.equal(plan[5].chapter, 2);
    assert.ok(plan.every((d) => d.ready && d.review === null));
  });

  it("오늘 이미 했으면 내일부터, '하나 더'가 열려 있으면 오늘부터", () => {
    const p = play(initialProgress(), "2026-10-26");
    assert.equal(planAhead(p, DEFAULT_SETTINGS, "2026-10-26", 1)[0].on, "2026-10-27");
    assert.equal(planAhead({ ...p, extraOn: "2026-10-26" }, DEFAULT_SETTINGS, "2026-10-26", 1)[0].on, "2026-10-26");
  });

  it("공부하는 요일만 — 금요일 다음은 월요일", () => {
    const plan = planAhead(initialProgress(), WEEKDAYS_ONLY, "2026-10-29", 4);
    assert.deepEqual(
      plan.map((d) => d.on),
      ["2026-10-29", "2026-10-30", "2026-11-02", "2026-11-03"],
    );
  });

  it("복습이 붙어 있으면 복습 먼저, 그다음 본 진도", () => {
    let p = initialProgress();
    for (const on of ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"]) p = play(p, on);
    p = play(p, "2026-10-24", POOR); // 5일째 확인 놀이 미달 → 1장 복습
    assert.ok(p.review);
    const plan = planAhead(p, DEFAULT_SETTINGS, "2026-10-25", 7);
    assert.deepEqual(
      plan.map((d) => [d.unit, d.day, d.review]),
      [
        [1, 1, 1],
        [1, 2, 2],
        [1, 3, 3],
        [1, 4, 4],
        [1, 5, 5],
        [1, 6, null],
        [1, 7, null],
      ],
    );
  });

  it("단원이 끝나면 다음 단원 1일, 준비 안 된 단원은 ready=false, 마지막 날 뒤로는 없다", () => {
    const p = { ...initialProgress(), unit: 1, day: 9 };
    const plan = planAhead(p, DEFAULT_SETTINGS, "2026-10-26", 3);
    assert.deepEqual(
      plan.map((d) => [d.unit, d.day]),
      [
        [1, 9],
        [1, 10],
        [2, 1],
      ],
    );
    const later = planAhead({ ...initialProgress(), unit: 3, day: 1 }, DEFAULT_SETTINGS, "2026-10-26", 1);
    assert.equal(later[0].ready, false);
    const end = planAhead({ ...initialProgress(), unit: 14, day: 19 }, DEFAULT_SETTINGS, "2026-10-26", 10);
    assert.deepEqual(
      end.map((d) => d.day),
      [19, 20],
    );
    assert.deepEqual(planAhead({ ...initialProgress(), unit: 14, day: 21 }, DEFAULT_SETTINGS, "2026-10-26", 5), []);
  });
});
