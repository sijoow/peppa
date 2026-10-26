/**
 * 진도 — 토도한글 '오늘의 모험' + 다른 메뉴(미션·은하계 여행·자유 모드·작업실)의 기록.
 * 토도 공개 자료(todoclassroom intro)에 있는 것: 5일마다 형성 평가, 기준보다 낮으면 5일치 복습 추가, 단원 기본 20일,
 *   반딧불이를 모으면 작업실 활동이 하나씩 열림, 미션을 다 하면 배지, 은하계 여행은 하루 5번.
 * 자료에 없어서 우리가 정한 것(2026-10-26 대조):
 *  · 하루에 한 번(부모가 '하나 더 열기'로 더 열 수 있다, 설정에서 끌 수도 있다)
 *  · 평가는 장 끝 날(5일째) 안에서, 통과 기준 80%(PASS_RATE), 첫 시도만 채점
 *  · 복습은 장마다 한 번, 복습 뒤 재평가 없이 다음 장 — 그래서 단원이 20일에서 최대 40일
 *  · 반딧불이 수(아래 FIREFLY_*) — 쓰지 않고 쌓이는 수(작업실은 누적 수로 열린다)
 *  · 단원 마지막 날을 마치면 다음 단원 1일로
 *
 * 저장·불러오기는 lib/store.ts(기기) · lib/sync.ts(MongoDB), 여기는 계산만.
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

import { dayPlan } from "../curriculum/days.ts";
import { DAYS_PER_CHAPTER, UNITS, unitOutline } from "../curriculum/outline.ts";
import type { DayPlan } from "../curriculum/types.ts";
import { DEFAULT_VOICE, isVoiceId, type VoiceId } from "./voices.ts";

/** 형성 평가 통과 기준 — 토도는 공개하지 않아서 80%로 정했다 */
export const PASS_RATE = 0.8;
export const FIREFLY_PER_ACTIVITY = 1;
export const FIREFLY_PER_DAY = 3;
export const FIREFLY_PASS = 5;
export const FIREFLY_MISSION_ITEM = 1;
export const FIREFLY_BADGE = 5;
export const FIREFLY_GALAXY_CLEAR = 2;
export const FIREFLY_FREE = 1;
/** 은하계 여행 — 토도: 하루 5번, 다음 날 다시 채워진다 */
export const GALAXY_PLAYS_PER_DAY = 5;
const HISTORY_MAX = 400;
const DAILY_KEEP = 120;

export interface ReviewState {
  unit: number;
  chapter: number;
  /** 복습 몇 일째 (1~5) */
  day: number;
}

export interface DoneRecord {
  key: string;
  unit: number;
  day: number;
  review: boolean;
  assess: boolean;
  /** 끝낸 날 (기기 시간 YYYY-MM-DD) */
  on: string;
  correct: number;
  total: number;
  /** 형성 평가 날만 true/false */
  passed: boolean | null;
  fireflies: number;
  /** 걸린 시간(ms) */
  ms?: number;
}

/** 하루 리포트 한 칸 — 학습 시간·활동 수·모은 반딧불이 (모든 메뉴 합) */
export interface DayStat {
  ms: number;
  acts: number;
  earned: number;
}

export interface MissionState {
  /** 끝낸 콘텐츠 번호 */
  done: number[];
  badge: boolean;
}

export interface GalaxyState {
  /** plays 를 센 날 — 날이 바뀌면 다시 5번 */
  on: string | null;
  plays: number;
  /** 은하마다 통과한 스테이지 수 */
  cleared: Record<string, number>;
}

export interface Progress {
  v: 1;
  unit: number;
  /** 그 단원에서 다음에 할 날 (1부터) */
  day: number;
  review: ReviewState | null;
  fireflies: number;
  history: DoneRecord[];
  /** 마지막으로 오늘의 모험을 끝낸 날 */
  lastPlayedOn: string | null;
  /** 부모가 '하나 더 열기'를 누른 날 */
  extraOn: string | null;
  daily: Record<string, DayStat>;
  missions: Record<string, MissionState>;
  galaxy: GalaxyState;
  /** 단원 찾기 퀴즈 결과 */
  diagnosed: { on: string; unit: number } | null;
  /** 처음으로 무엇이든 한 날 — 「하온이 스케줄」의 '온 지 며칠째' (예전 기록이면 기록에서 찾아 채운다) */
  firstOn: string | null;
}

/** 화면 방향 — 설치한 앱이면 이 방향으로 고정한다(lib/orientation). 처음엔 세로 */
export type Orientation = "portrait" | "landscape";

export interface Settings {
  v: 1;
  /** 하루 한 번만 (마스터 아이디는 제한 없음) */
  oneADay: boolean;
  /** 성우 — 민정·수아 */
  voice: VoiceId;
  orientation: Orientation;
  /** 시작한 날을 부모가 고쳤으면 그 날(YYYY-MM-DD) — null 이면 처음 한 날(progress.firstOn) */
  startOn: string | null;
  /** 공부하는 요일(0=일 … 6=토) — 스케줄 달력·계획에만 쓴다. 하루 한 번 규칙(canPlayToday)과는 따로 */
  studyDays: number[];
}

/** 공부하는 요일 기본값 — 매일 */
export const EVERY_DAY: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

export interface SessionRef {
  key: string;
  review: boolean;
  plan: DayPlan;
}

export interface SessionResult {
  /** 점수 활동에서 첫 시도에 맞힌 수 */
  correct: number;
  total: number;
  /** 끝낸 활동 수(책 포함) — 반딧불이 계산용 */
  activities: number;
  /** 걸린 시간(ms) */
  ms?: number;
}

export function initialProgress(startUnit = 1): Progress {
  return {
    v: 1,
    unit: startUnit,
    day: 1,
    review: null,
    fireflies: 0,
    history: [],
    lastPlayedOn: null,
    extraOn: null,
    daily: {},
    missions: {},
    galaxy: { on: null, plays: 0, cleared: {} },
    diagnosed: null,
    firstOn: null,
  };
}

export const DEFAULT_SETTINGS: Settings = { v: 1, oneADay: true, voice: DEFAULT_VOICE, orientation: "portrait", startOn: null, studyDays: [...EVERY_DAY] };

/** 지금 할 하루 — 복습이 붙어 있으면 복습 먼저. 아직 짜 두지 않은 단원이면 null */
export function currentSession(p: Progress): SessionRef | null {
  if (p.review) {
    const { unit, chapter, day } = p.review;
    const base = dayPlan(unit, (chapter - 1) * DAYS_PER_CHAPTER + day);
    if (!base) return null;
    return {
      key: `u${unit}c${chapter}r${day}`,
      review: true,
      plan: { ...base, assess: false, title: `복습 ${day}일째 · ${base.title === "확인 놀이" ? "다시 놀기" : base.title}` },
    };
  }
  const plan = dayPlan(p.unit, p.day);
  if (!plan) return null;
  return { key: `u${p.unit}d${p.day}`, review: false, plan };
}

export function canPlayToday(p: Progress, s: Settings, today: string): boolean {
  if (!s.oneADay) return true;
  return p.lastPlayedOn !== today || p.extraOn === today;
}

/** 진도가 (unit, day) 에 닿았는지 — 메뉴·놀이가 열리는 기준 */
export function reached(p: Progress, unit: number, day = 1): boolean {
  return p.unit > unit || (p.unit === unit && p.day >= day);
}

export function passedOf(plan: DayPlan, r: SessionResult): boolean | null {
  if (!plan.assess) return null;
  if (r.total === 0) return true;
  return r.correct / r.total >= PASS_RATE;
}

export function firefliesFor(plan: DayPlan, r: SessionResult): number {
  const passed = passedOf(plan, r);
  return r.activities * FIREFLY_PER_ACTIVITY + FIREFLY_PER_DAY + (passed ? FIREFLY_PASS : 0);
}

/** 하루 리포트에 더하고 반딧불이를 쌓는다 — 오래된 날은 DAILY_KEEP 일만 남긴다 */
export function logPlay(p: Progress, today: string, add: Partial<DayStat>): Progress {
  const cur = p.daily[today] ?? { ms: 0, acts: 0, earned: 0 };
  const day: DayStat = { ms: cur.ms + (add.ms ?? 0), acts: cur.acts + (add.acts ?? 0), earned: cur.earned + (add.earned ?? 0) };
  const keys = Object.keys({ ...p.daily, [today]: day }).sort().slice(-DAILY_KEEP);
  const daily: Record<string, DayStat> = {};
  for (const k of keys) daily[k] = k === today ? day : p.daily[k];
  return { ...p, daily, fireflies: p.fireflies + (add.earned ?? 0), firstOn: p.firstOn ?? today };
}

/** 하루를 끝냈다 → 다음 진도 + 기록 한 줄 */
export function completeSession(
  p: Progress,
  ref: SessionRef,
  r: SessionResult,
  today: string,
): { next: Progress; record: DoneRecord } {
  const passed = passedOf(ref.plan, r);
  const earned = firefliesFor(ref.plan, r);
  const record: DoneRecord = {
    key: ref.key,
    unit: ref.plan.unit,
    day: ref.plan.day,
    review: ref.review,
    assess: ref.plan.assess,
    on: today,
    correct: r.correct,
    total: r.total,
    passed,
    fireflies: earned,
    ...(r.ms !== undefined ? { ms: r.ms } : {}),
  };

  let { unit, day, review } = p;
  if (ref.review) {
    // 복습 판은 복습 날짜만 넘긴다 — 본 진도(unit/day)는 이미 다음 장에 가 있다
    if (review) review = review.day >= DAYS_PER_CHAPTER ? null : { ...review, day: review.day + 1 };
  } else {
    if (passed === false) review = { unit, chapter: ref.plan.chapter, day: 1 };
    day += 1;
    const days = unitOutline(unit)?.days ?? 0;
    if (day > days && unit < UNITS.length) {
      unit += 1;
      day = 1;
    }
  }

  const moved: Progress = {
    ...p,
    unit,
    day,
    review,
    history: [...p.history, record].slice(-HISTORY_MAX),
    // 오늘 이미 한 번 했다면 이번 판은 '하나 더'를 쓴 것 — 다 썼으니 닫는다
    extraOn: p.lastPlayedOn === today ? null : p.extraOn,
    lastPlayedOn: today,
  };
  return { next: logPlay(moved, today, { ms: r.ms ?? 0, acts: r.activities, earned }), record };
}

/** 미션 콘텐츠 하나를 끝냈다 — 처음 끝낸 것만 반딧불이, 다 끝내면 배지 */
export function completeMissionItem(
  p: Progress,
  missionId: string,
  index: number,
  total: number,
  today: string,
): { next: Progress; earned: number; badgeNow: boolean } {
  const cur = p.missions[missionId] ?? { done: [], badge: false };
  const fresh = !cur.done.includes(index);
  const done = fresh ? [...cur.done, index].sort((a, b) => a - b) : cur.done;
  const badgeNow = !cur.badge && done.length >= total;
  const earned = (fresh ? FIREFLY_MISSION_ITEM : 0) + (badgeNow ? FIREFLY_BADGE : 0);
  const withMission: Progress = { ...p, missions: { ...p.missions, [missionId]: { done, badge: cur.badge || badgeNow } } };
  return { next: logPlay(withMission, today, { acts: 1, earned }), earned, badgeNow };
}

export function galaxyPlaysLeft(p: Progress, today: string): number {
  return p.galaxy.on === today ? Math.max(0, GALAXY_PLAYS_PER_DAY - p.galaxy.plays) : GALAXY_PLAYS_PER_DAY;
}

/** 은하계 한 판 시작 — 하루 5번 중 하나를 쓴다. 남은 게 없으면 null */
export function startGalaxyPlay(p: Progress, today: string): Progress | null {
  if (galaxyPlaysLeft(p, today) <= 0) return null;
  const plays = p.galaxy.on === today ? p.galaxy.plays + 1 : 1;
  return { ...p, galaxy: { ...p.galaxy, on: today, plays } };
}

/** 은하계 스테이지 결과 — 처음 통과한 스테이지만 반딧불이 */
export function finishGalaxyStage(
  p: Progress,
  galaxyId: string,
  stage: number,
  cleared: boolean,
  ms: number,
  today: string,
): { next: Progress; earned: number } {
  const best = p.galaxy.cleared[galaxyId] ?? 0;
  const fresh = cleared && stage > best;
  const earned = fresh ? FIREFLY_GALAXY_CLEAR : 0;
  const withGalaxy: Progress = fresh ? { ...p, galaxy: { ...p.galaxy, cleared: { ...p.galaxy.cleared, [galaxyId]: stage } } } : p;
  return { next: logPlay(withGalaxy, today, { ms, acts: 1, earned }), earned };
}

/**
 * 진도율 — 기본 학습일(전체 270일, 단계별로도) 중 마친 날. 복습 날은 세지 않는다.
 * 시작 단원을 건너뛰었으면 앞 단원은 마친 것으로 센다(토도의 시작 수준과 같은 뜻).
 */
export function progressRate(p: Progress, stage?: number): { done: number; total: number; rate: number } {
  const units = stage ? UNITS.filter((u) => u.stage === stage) : UNITS;
  let done = 0;
  let total = 0;
  for (const u of units) {
    total += u.days;
    if (u.id < p.unit) done += u.days;
    else if (u.id === p.unit) done += Math.min(p.day - 1, u.days);
  }
  return { done, total, rate: total ? done / total : 0 };
}

/** 부모가 시작 단원을 바꾸면 오늘의 모험 진도만 새로 — 반딧불이·기록·미션·은하계·진단은 남긴다 */
export function restartAt(p: Progress, unit: number): Progress {
  const fresh = initialProgress(unit);
  return { ...p, unit: fresh.unit, day: fresh.day, review: null, lastPlayedOn: null, extraOn: null };
}

/** 기기 날짜(YYYY-MM-DD) — 하루 한 번 규칙의 '하루' */
export function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' 의 n일 전 (기기 날짜 기준) */
export function daysBefore(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(y, m - 1, d - n));
}

const isInt = (n: unknown, min: number, max: number): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** 저장소에서 꺼낸 값 검사 — 모양이 틀리면 처음부터 (아이 앱이 깨진 값으로 멈추면 안 된다) */
export function normalizeProgress(raw: unknown): Progress {
  const base = initialProgress();
  const o = obj(raw);
  if (!o) return base;
  const unit = isInt(o.unit, 1, UNITS.length) ? o.unit : base.unit;
  // 마지막 단원을 다 마치면 day 가 days+1 에 머문다 — 그것도 맞는 값
  const maxDay = (unitOutline(unit)?.days ?? 20) + 1;
  const day = isInt(o.day, 1, maxDay) ? o.day : 1;
  let review: ReviewState | null = null;
  const rv = obj(o.review);
  if (rv && isInt(rv.unit, 1, UNITS.length) && isInt(rv.chapter, 1, 4) && isInt(rv.day, 1, DAYS_PER_CHAPTER)) {
    review = { unit: rv.unit, chapter: rv.chapter, day: rv.day };
  }

  const daily: Record<string, DayStat> = {};
  for (const [k, v] of Object.entries(obj(o.daily) ?? {})) {
    const d = obj(v);
    if (!isDay(k) || !d) continue;
    daily[k] = { ms: isInt(d.ms, 0, 86_400_000) ? d.ms : 0, acts: isInt(d.acts, 0, 100_000) ? d.acts : 0, earned: isInt(d.earned, 0, 100_000) ? d.earned : 0 };
  }

  const missions: Record<string, MissionState> = {};
  for (const [k, v] of Object.entries(obj(o.missions) ?? {})) {
    const m = obj(v);
    if (!m || !/^m\d{2}$/.test(k)) continue;
    const done = Array.isArray(m.done) ? m.done.filter((n): n is number => isInt(n, 0, 99)) : [];
    missions[k] = { done: [...new Set(done)].sort((a, b) => a - b), badge: m.badge === true };
  }

  const g = obj(o.galaxy);
  const cleared: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(g?.cleared) ?? {})) if (isInt(v, 0, 99)) cleared[k] = v;
  const galaxy: GalaxyState = { on: isDay(g?.on) ? g.on : null, plays: isInt(g?.plays, 0, 99) ? g.plays : 0, cleared };

  const dg = obj(o.diagnosed);
  const diagnosed = dg && isDay(dg.on) && isInt(dg.unit, 1, UNITS.length) ? { on: dg.on, unit: dg.unit } : null;

  const history = Array.isArray(o.history) ? (o.history.filter((h) => h && typeof h === "object") as DoneRecord[]).slice(-HISTORY_MAX) : [];
  // 처음 한 날 — 이 칸이 없던 예전 기록이면 남은 기록(오늘의 모험·하루 리포트)에서 가장 이른 날
  const seen = [...history.map((h) => h.on), ...Object.keys(daily)].filter(isDay).sort();

  return {
    v: 1,
    unit,
    day,
    review,
    fireflies: isInt(o.fireflies, 0, 1_000_000) ? o.fireflies : 0,
    history,
    lastPlayedOn: isDay(o.lastPlayedOn) ? o.lastPlayedOn : null,
    extraOn: isDay(o.extraOn) ? o.extraOn : null,
    daily,
    missions,
    galaxy,
    diagnosed,
    firstOn: isDay(o.firstOn) ? o.firstOn : (seen[0] ?? null),
  };
}

export function normalizeSettings(raw: unknown): Settings {
  const o = obj(raw);
  if (!o) return DEFAULT_SETTINGS;
  return {
    v: 1,
    oneADay: typeof o.oneADay === "boolean" ? o.oneADay : DEFAULT_SETTINGS.oneADay,
    voice: isVoiceId(o.voice) ? o.voice : DEFAULT_SETTINGS.voice,
    orientation: o.orientation === "landscape" || o.orientation === "portrait" ? o.orientation : DEFAULT_SETTINGS.orientation,
    startOn: isDay(o.startOn) ? o.startOn : null,
    studyDays: studyDaysOf(o.studyDays),
  };
}

/** 공부하는 요일 검사 — 0~6 만, 겹치지 않게, 순서대로. 하루도 없으면 매일(계획을 짤 수 없으니까) */
function studyDaysOf(v: unknown): number[] {
  const days = Array.isArray(v) ? [...new Set(v.filter((n): n is number => isInt(n, 0, 6)))].sort((a, b) => a - b) : [];
  return days.length ? days : [...EVERY_DAY];
}
