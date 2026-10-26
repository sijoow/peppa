import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  canPlayToday,
  completeMissionItem,
  completeSession,
  currentSession,
  DEFAULT_SETTINGS,
  finishGalaxyStage,
  FIREFLY_BADGE,
  FIREFLY_GALAXY_CLEAR,
  FIREFLY_MISSION_ITEM,
  FIREFLY_PASS,
  FIREFLY_PER_ACTIVITY,
  FIREFLY_PER_DAY,
  galaxyPlaysLeft,
  initialProgress,
  localDay,
  logPlay,
  normalizeProgress,
  normalizeSettings,
  progressRate,
  reached,
  restartAt,
  startGalaxyPlay,
  type Progress,
  type SessionResult,
} from "./progress.ts";

const PERFECT = (n = 6): SessionResult => ({ correct: 10, total: 10, activities: n });
const POOR: SessionResult = { correct: 3, total: 10, activities: 6 };

/** 지금 판을 끝낸다 */
function play(p: Progress, r: SessionResult = PERFECT(), today = "2026-10-26"): Progress {
  const ref = currentSession(p);
  assert.ok(ref, "할 판이 있어야 한다");
  return completeSession(p, ref, r, today).next;
}

describe("오늘의 모험 진도", () => {
  it("처음은 1단원 1일", () => {
    assert.equal(currentSession(initialProgress())?.key, "u1d1");
  });

  it("하루를 끝내면 다음 날 + 반딧불이", () => {
    const p = play(initialProgress(), { correct: 0, total: 0, activities: 6 });
    assert.equal(p.day, 2);
    assert.equal(p.fireflies, 6 * FIREFLY_PER_ACTIVITY + FIREFLY_PER_DAY);
    assert.equal(p.history.length, 1);
    assert.equal(p.lastPlayedOn, "2026-10-26");
  });

  it("하루 한 번 — 같은 날은 막히고, '하나 더 열기'로 한 판 더", () => {
    let p = play(initialProgress());
    assert.equal(canPlayToday(p, DEFAULT_SETTINGS, "2026-10-26"), false);
    assert.equal(canPlayToday(p, DEFAULT_SETTINGS, "2026-10-27"), true);
    assert.equal(canPlayToday(p, { ...DEFAULT_SETTINGS, oneADay: false }, "2026-10-26"), true);

    p = { ...p, extraOn: "2026-10-26" };
    assert.equal(canPlayToday(p, DEFAULT_SETTINGS, "2026-10-26"), true);
    p = play(p);
    assert.equal(p.extraOn, null, "한 판 쓰면 닫힌다");
    assert.equal(canPlayToday(p, DEFAULT_SETTINGS, "2026-10-26"), false);
  });

  it("5일째 형성 평가 통과 → 복습 없이 6일", () => {
    let p = initialProgress();
    for (let i = 0; i < 4; i++) p = play(p);
    const before = p.fireflies;
    p = play(p, PERFECT());
    assert.equal(p.day, 6);
    assert.equal(p.review, null);
    assert.equal(p.fireflies - before, 6 * FIREFLY_PER_ACTIVITY + FIREFLY_PER_DAY + FIREFLY_PASS);
    assert.equal(p.history.at(-1)?.passed, true);
  });

  it("형성 평가 미달 → 그 장 복습 5일 → 다음 장(6일)", () => {
    let p = initialProgress();
    for (let i = 0; i < 4; i++) p = play(p);
    p = play(p, POOR);
    assert.equal(p.history.at(-1)?.passed, false);
    assert.deepEqual(p.review, { unit: 1, chapter: 1, day: 1 });

    for (let r = 1; r <= 5; r++) {
      const ref = currentSession(p);
      assert.equal(ref?.key, `u1c1r${r}`);
      assert.equal(ref?.review, true);
      assert.equal(ref?.plan.assess, false, "복습은 평가가 아니다");
      p = play(p, POOR);
    }
    assert.equal(p.review, null);
    assert.equal(currentSession(p)?.key, "u1d6");
  });

  it("1단원 10일을 마치면 2단원 1일, 2단원 20일 뒤는 아직 준비 중", () => {
    let p = initialProgress();
    for (let i = 0; i < 10; i++) p = play(p);
    assert.equal(currentSession(p)?.key, "u2d1");
    for (let i = 0; i < 20; i++) p = play(p);
    assert.equal(p.unit, 3);
    assert.equal(p.day, 1);
    assert.equal(currentSession(p), null);
  });

  it("마지막 날 형성 평가 미달 → 복습이 끝나고 다음 단원", () => {
    let p = initialProgress();
    for (let i = 0; i < 9; i++) p = play(p);
    p = play(p, POOR);
    assert.equal(p.unit, 2);
    assert.deepEqual(p.review, { unit: 1, chapter: 2, day: 1 });
    assert.equal(currentSession(p)?.key, "u1c2r1");
    for (let r = 1; r <= 5; r++) p = play(p);
    assert.equal(currentSession(p)?.key, "u2d1");
  });

  it("진도율 — 전체 270일, 1단계 30일 기준. 복습 날은 세지 않는다", () => {
    let p = initialProgress();
    assert.deepEqual(progressRate(p), { done: 0, total: 270, rate: 0 });
    for (let i = 0; i < 4; i++) p = play(p);
    p = play(p, POOR); // 5일째 미달 → 복습이 붙지만 진도율은 5일
    assert.equal(progressRate(p).done, 5);
    for (let r = 0; r < 5; r++) p = play(p);
    assert.equal(progressRate(p).done, 5, "복습 5일은 진도율에 안 들어간다");
    assert.deepEqual(progressRate(p, 1), { done: 5, total: 30, rate: 5 / 30 });
    assert.equal(progressRate(restartAt(p, 5)).done, 70, "5단원부터 시작하면 앞 4단원(10+20+20+20일)은 마친 것으로");
  });

  it("시작 단원을 바꾸면 진도는 새로, 반딧불이는 남는다", () => {
    const p = restartAt({ ...initialProgress(), fireflies: 42, day: 7 }, 2);
    assert.equal(p.unit, 2);
    assert.equal(p.day, 1);
    assert.equal(p.fireflies, 42);
  });
});

describe("다른 메뉴 기록 — 리포트·미션·은하계", () => {
  const T = "2026-10-26";

  it("하루 리포트 — 오늘의 모험 시간·활동·반딧불이가 날짜별로 쌓인다", () => {
    let p = play(initialProgress(), { correct: 0, total: 0, activities: 6, ms: 600_000 });
    p = logPlay(p, T, { ms: 60_000, acts: 1, earned: 1 });
    assert.deepEqual(p.daily[T], { ms: 660_000, acts: 7, earned: 6 + FIREFLY_PER_DAY + 1 });
    assert.equal(p.fireflies, 6 + FIREFLY_PER_DAY + 1);
    assert.equal(p.history[0].ms, 600_000);
  });

  it("미션 — 처음 끝낸 콘텐츠만 반딧불이, 다 끝내면 배지 한 번", () => {
    let p = initialProgress();
    let r = completeMissionItem(p, "m03", 0, 2, T);
    assert.equal(r.earned, FIREFLY_MISSION_ITEM);
    p = r.next;
    r = completeMissionItem(p, "m03", 0, 2, T);
    assert.equal(r.earned, 0, "같은 콘텐츠를 다시 하면 반딧불이 없음");
    p = r.next;
    r = completeMissionItem(p, "m03", 1, 2, T);
    assert.equal(r.badgeNow, true);
    assert.equal(r.earned, FIREFLY_MISSION_ITEM + FIREFLY_BADGE);
    assert.deepEqual(r.next.missions.m03, { done: [0, 1], badge: true });
    assert.equal(completeMissionItem(r.next, "m03", 1, 2, T).badgeNow, false, "배지는 한 번만");
  });

  it("은하계 — 하루 5번, 다음 날 다시 채워지고, 처음 통과한 스테이지만 반딧불이", () => {
    let p: Progress | null = initialProgress();
    for (let i = 0; i < 5; i++) p = startGalaxyPlay(p!, T);
    assert.equal(galaxyPlaysLeft(p!, T), 0);
    assert.equal(startGalaxyPlay(p!, T), null);
    assert.equal(galaxyPlaysLeft(p!, "2026-10-27"), 5);
    let r = finishGalaxyStage(p!, "pick", 1, true, 50_000, T);
    assert.equal(r.earned, FIREFLY_GALAXY_CLEAR);
    assert.equal(r.next.galaxy.cleared.pick, 1);
    r = finishGalaxyStage(r.next, "pick", 1, true, 50_000, T);
    assert.equal(r.earned, 0);
    r = finishGalaxyStage(r.next, "pick", 2, false, 50_000, T);
    assert.equal(r.next.galaxy.cleared.pick, 1, "못 깬 스테이지는 안 남는다");
  });

  it("진도 닿음 — 메뉴가 열리는 기준", () => {
    const p = { ...initialProgress(), unit: 2, day: 3 };
    assert.ok(reached(p, 1, 10));
    assert.ok(reached(p, 2, 3));
    assert.ok(!reached(p, 2, 4));
    assert.ok(!reached(p, 3));
  });

  it("시작 단원을 바꿔도 미션·은하계·리포트는 남는다", () => {
    let p = completeMissionItem(initialProgress(), "m01", 0, 3, T).next;
    p = logPlay(p, T, { ms: 1000 });
    const q = restartAt(p, 3);
    assert.equal(q.unit, 3);
    assert.deepEqual(q.missions, p.missions);
    assert.deepEqual(q.daily, p.daily);
  });

  it("설정 — 하루 한 번은 기본 켜짐, 성우는 기본 수아, 화면은 기본 세로, 시작한 날은 자동, 매일 공부, 예전 칸(unlockAll)은 버린다", () => {
    const EVERY = [0, 1, 2, 3, 4, 5, 6];
    assert.deepEqual(normalizeSettings({}), { v: 1, oneADay: true, voice: "sua", orientation: "portrait", startOn: null, studyDays: EVERY });
    assert.deepEqual(
      normalizeSettings({ oneADay: false, unlockAll: true, voice: "minjeong", orientation: "landscape", startOn: "2026-10-15", studyDays: [5, 1, 3, 1] }),
      { v: 1, oneADay: false, voice: "minjeong", orientation: "landscape", startOn: "2026-10-15", studyDays: [1, 3, 5] },
    );
    assert.equal(normalizeSettings({ voice: "nobody" }).voice, "sua", "없는 성우면 기본");
    assert.equal(normalizeSettings({ orientation: "sideways" }).orientation, "portrait", "모르는 방향이면 세로");
    assert.equal(normalizeSettings({ startOn: "10/15" }).startOn, null, "날짜 모양이 아니면 자동");
    assert.deepEqual(normalizeSettings({ studyDays: [] }).studyDays, EVERY, "하루도 없으면 매일");
    assert.deepEqual(normalizeSettings({ studyDays: [7, -1, "월"] }).studyDays, EVERY, "모르는 요일만 있으면 매일");
  });

  it("처음 한 날 — 무엇이든 처음 한 날이 남고, 예전 기록이면 기록에서 찾는다", () => {
    let p = logPlay(initialProgress(), "2026-10-20", { acts: 1, earned: 1 });
    p = logPlay(p, "2026-10-22", { acts: 1, earned: 1 });
    assert.equal(p.firstOn, "2026-10-20");
    assert.equal(restartAt(p, 3).firstOn, "2026-10-20", "시작 단원을 바꿔도 남는다");
    const old = { unit: 1, day: 3, history: [{ on: "2026-10-12" }, { on: "2026-10-11" }], daily: { "2026-10-13": { ms: 1, acts: 1, earned: 0 } } };
    assert.equal(normalizeProgress(old).firstOn, "2026-10-11");
    assert.equal(normalizeProgress({ ...old, firstOn: "2026-10-01" }).firstOn, "2026-10-01");
    assert.equal(normalizeProgress({ unit: 1, day: 1 }).firstOn, null);
  });
});

describe("저장 값 검사", () => {
  it("깨진 값 → 처음부터", () => {
    assert.deepEqual(normalizeProgress(null), initialProgress());
    assert.deepEqual(normalizeProgress("x"), initialProgress());
    assert.equal(normalizeProgress({ unit: 99, day: -1 }).unit, 1);
  });

  it("멀쩡한 값은 그대로", () => {
    let p = play(play(initialProgress()), POOR);
    p = completeMissionItem(p, "m05", 2, 8, "2026-10-26").next;
    p = finishGalaxyStage(startGalaxyPlay(p, "2026-10-26")!, "pick", 1, true, 1000, "2026-10-26").next;
    p = { ...p, diagnosed: { on: "2026-10-26", unit: 3 } };
    assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(p))), p);
  });

  it("예전 모양(새 칸 없음)도 받아 준다", () => {
    const old = { unit: 1, day: 4, fireflies: 20, history: [] };
    const p = normalizeProgress(old);
    assert.equal(p.day, 4);
    assert.deepEqual(p.daily, {});
    assert.deepEqual(p.galaxy, { on: null, plays: 0, cleared: {} });
  });

  it("기기 날짜", () => {
    assert.equal(localDay(new Date(2026, 9, 6)), "2026-10-06");
  });
});
