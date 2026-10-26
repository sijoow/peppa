/**
 * 아이 스케줄 — 부모 페이지 「하온이 스케줄」: 시작한 날·며칠째·공부한 날·연속·달력·앞으로의 모험.
 * 앞으로의 계획은 '공부하는 요일'(settings.studyDays)마다 오늘의 모험 하루씩, 확인 놀이는 모두 통과한다고 보고 짠다
 *   (복습이 붙으면 그만큼 뒤로 밀린다). 하루 한 번 규칙(canPlayToday)은 바꾸지 않는다 — 요일은 달력·계획에만 쓴다.
 * 날짜는 모두 기기 날짜 'YYYY-MM-DD'(progress.localDay 와 같은 모양).
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

import { hasContent } from "../curriculum/days.ts";
import { chapterOfDay, DAYS_PER_CHAPTER, isAssessDay, UNITS, unitOutline } from "../curriculum/outline.ts";
import { daysBefore, EVERY_DAY, localDay, type Progress, type Settings } from "./progress.ts";

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function partsOf(day: string): [number, number, number] {
  const [y, m, d] = day.split("-").map(Number);
  return [y, m, d];
}

/** 요일 (0=일 … 6=토) */
export function weekdayOf(day: string): number {
  const [y, m, d] = partsOf(day);
  return new Date(y, m - 1, d).getDay();
}

export function addDays(day: string, n: number): string {
  return daysBefore(day, -n);
}

/** from 에서 to 까지 며칠 (같은 날이면 0, to 가 앞이면 음수) */
export function dayDiff(from: string, to: string): number {
  const [y1, m1, d1] = partsOf(from);
  const [y2, m2, d2] = partsOf(to);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** "10/27(화)" */
export function shortDate(day: string): string {
  const [, m, d] = partsOf(day);
  return `${m}/${d}(${WEEKDAYS[weekdayOf(day)]})`;
}

/** "2026년 10월 15일(목)" */
export function longDate(day: string): string {
  const [y, m, d] = partsOf(day);
  return `${y}년 ${m}월 ${d}일(${WEEKDAYS[weekdayOf(day)]})`;
}

/** 공부한 날 — 오늘의 모험을 한 날 / 무엇이든 한 날(자유 모드·미션·은하계·작업실 포함) */
export function studyLog(p: Progress): { adventure: Set<string>; played: Set<string> } {
  const adventure = new Set(p.history.map((r) => r.on).filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)));
  const played = new Set(adventure);
  for (const [d, s] of Object.entries(p.daily)) if (s.ms > 0 || s.acts > 0) played.add(d);
  return { adventure, played };
}

/** 시작한 날 — 부모가 정한 날 > 처음 한 날 > 오늘 */
export function startDay(p: Progress, s: Settings, today: string): string {
  return s.startOn ?? p.firstOn ?? today;
}

/** 공부하는 요일인가 */
export function isStudyDay(day: string, studyDays: readonly number[]): boolean {
  return studyDays.includes(weekdayOf(day));
}

/**
 * 연속으로 공부한 날 — 오늘까지(오늘 아직 안 했으면 어제까지, 오늘은 아직 안 끝났으니까).
 * 쉬는 요일은 건너뛴다(쉬어도 끊기지 않고, 그날 했으면 하루로 센다).
 */
export function streakOf(played: ReadonlySet<string>, today: string, studyDays: readonly number[]): number {
  let n = 0;
  let d = played.has(today) ? today : addDays(today, -1);
  for (let i = 0; i < 1000; i++, d = addDays(d, -1)) {
    if (played.has(d)) n++;
    else if (isStudyDay(d, studyDays)) break;
  }
  return n;
}

export interface PlannedDay {
  /** 하는 날 */
  on: string;
  unit: number;
  /** 단원 안에서 몇째 날 (복습이면 그 장의 날) */
  day: number;
  chapter: number;
  /** 복습이면 몇 일째(1~5), 아니면 null */
  review: number | null;
  /** 장 끝 확인 놀이 날 */
  assess: boolean;
  /** 장 제목 (과정표) */
  title: string;
  /** 하루치 놀이가 다 짜여 있나 — 아니면 '준비 중' */
  ready: boolean;
}

function chapterTitle(unit: number, chapter: number): string {
  return unitOutline(unit)?.chapters.find((c) => c.no === chapter)?.title ?? "";
}

/**
 * 앞으로의 모험 — 공부하는 요일마다 하루씩, 최대 count 개(과정이 끝나면 거기까지).
 * 오늘 모험을 이미 했으면(그리고 '하나 더'가 안 열렸으면) 내일부터.
 */
export function planAhead(p: Progress, s: Settings, today: string, count: number): PlannedDay[] {
  const out: PlannedDay[] = [];
  const studyDays = s.studyDays.length ? s.studyDays : EVERY_DAY;
  const doneToday = p.lastPlayedOn === today && p.extraOn !== today;
  let on = doneToday ? addDays(today, 1) : today;
  let review = p.review ? { ...p.review } : null;
  let { unit, day } = p;
  while (out.length < count) {
    while (!isStudyDay(on, studyDays)) on = addDays(on, 1);
    if (review) {
      const { unit: u, chapter, day: rd } = review;
      out.push({ on, unit: u, day: (chapter - 1) * DAYS_PER_CHAPTER + rd, chapter, review: rd, assess: false, title: chapterTitle(u, chapter), ready: hasContent(u) });
      // 복습 판 동안 본 진도는 이미 다음 장에 가 있다(progress.completeSession)
      review = rd >= DAYS_PER_CHAPTER ? null : { ...review, day: rd + 1 };
    } else {
      const days = unitOutline(unit)?.days ?? 0;
      if (day > days) break; // 마지막 단원까지 다 했다
      const chapter = chapterOfDay(day);
      out.push({ on, unit, day, chapter, review: null, assess: isAssessDay(day), title: chapterTitle(unit, chapter), ready: hasContent(unit) });
      day += 1;
      if (day > days && unit < UNITS.length) {
        unit += 1;
        day = 1;
      }
    }
    on = addDays(on, 1);
  }
  return out;
}

/** 달력 한 달 — 일요일부터 한 주씩, 빈칸은 null. month 는 1~12 */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const lead = new Date(year, month - 1, 1).getDay();
  const last = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: last }, (_, i) => localDay(new Date(year, month - 1, i + 1)))];
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** 이름 뒤에 '가'·'는'을 바로 붙일 수 있게 — 받침이 있으면 '이'를 붙인다(하온 → 하온이, 지수 → 지수) */
export function nickOf(name: string): string {
  const last = name.trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return name.trim();
  return code % 28 === 0 ? name.trim() : `${name.trim()}이`;
}
