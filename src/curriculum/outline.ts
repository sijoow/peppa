/**
 * 토도한글 전체 과정표 — 6단계 · 14단원 · 54장 (2026-10-26, 토도 클래스룸 공개 커리큘럼 기준).
 *   https://www.todoclassroom.com/todohangeul/curri · /intro · /help
 *
 * 장 하나는 5일. 1단원만 2장(10일), 나머지 단원은 4장(20일) → 기본 270일.
 * 장 끝(5·10·15·20일)마다 형성 평가, 기준에 못 미치면 5일 복습이 붙는다 → 단원은 최대 40일.
 *
 * 공개 자료에 없어서 우리가 정한 것: 8단원 이중모음의 장별 배정(미션 순서 ㅘㅝㅟㅢ → ㅑㅕㅛㅠ → ㅔㅐ → ㅚㅙㅖㅒ 를 따른다).
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

import type { StageOutline, StartLevel, UnitOutline } from "./types.ts";

export const STAGES: StageOutline[] = [
  { id: 1, title: "한글 학습 기초", topics: ["디지털 리터러시", "자모자 지식", "음운 인식", "통글자"] },
  { id: 2, title: "기본 모음과 기본 자음", topics: ["파닉스", "한글 알파벳 원리", "낱말 읽기", "정자법"] },
  { id: 3, title: "기본 받침", topics: ["파닉스", "한글 알파벳 원리", "낱말 읽기", "정자법"] },
  { id: 4, title: "복잡한 모음과 자음", topics: ["파닉스", "한글 알파벳 원리", "낱말 읽기", "정자법"] },
  {
    id: 5,
    title: "글자와 소리가 다른 받침 + 읽기 이해 기초",
    topics: ["맞춤법", "종성 규칙", "연음 규칙", "경음 규칙", "읽기 이해"],
  },
  {
    id: 6,
    title: "겹받침과 음운 규칙 + 읽기 이해 심화",
    topics: ["맞춤법", "사이시옷", "ㅅ 탈락", "ㅎ 탈락", "격음화", "겹받침 읽기", "읽기 이해"],
  },
];

const four = (a: string, b: string): { no: number; title: string }[] => [
  { no: 1, title: `${a} (1)` },
  { no: 2, title: `${a} (2)` },
  { no: 3, title: `${b} (1)` },
  { no: 4, title: `${b} (2)` },
];

export const UNITS: UnitOutline[] = [
  {
    id: 1,
    stage: 1,
    title: "낱글자의 모양과 이름을 눈에 익히며 한글 학습 준비",
    days: 10,
    chapters: [
      { no: 1, title: "글자 학습 준비 (기기 익히기)" },
      { no: 2, title: "서로 다른 글자 구분, 글자 이름 익히기" },
    ],
  },
  {
    id: 2,
    stage: 1,
    title: "주제별 낱말을 눈에 익히면서 파닉스 학습 준비",
    days: 20,
    chapters: [
      { no: 1, title: "통글자 낱말: 과일·야채" },
      { no: 2, title: "통글자 낱말: 음식" },
      { no: 3, title: "통글자 낱말: 동물" },
      { no: 4, title: "통글자 낱말: 가족·옷" },
    ],
  },
  { id: 3, stage: 2, title: "기본 모음과 기본 자음 배우기", days: 20, chapters: four("기본 모음 ㅏㅓㅗㅜㅡㅣ", "기본 자음 ㄱㄴㄷㄹ") },
  {
    id: 4,
    stage: 2,
    title: "자음과 모음으로 이루어진 글자 읽기",
    days: 20,
    chapters: four("기본 자음 ㅁㅂㅅㅈㅎ", "자음+모음 글자 읽기"),
  },
  { id: 5, stage: 3, title: "받침으로 사용되는 자음 배우기", days: 20, chapters: four("받침 ㅁㅇ", "받침 ㄴㄹ") },
  { id: 6, stage: 3, title: "받침이 있는 글자 읽기", days: 20, chapters: four("받침 ㅂㄱ", "받침 있는 쉬운 글자 읽기") },
  {
    id: 7,
    stage: 4,
    title: "거센소리와 된소리 자음 배우기",
    days: 20,
    chapters: four("거센소리 ㅋㅌㅍㅊ", "된소리 ㄲㄸㅃㅆㅉ"),
  },
  {
    id: 8,
    stage: 4,
    title: "더 복잡한 모음을 배우고 글자 읽기를 연습",
    days: 20,
    chapters: [
      { no: 1, title: "이중모음 ㅘㅝㅟㅢ" },
      { no: 2, title: "이중모음 ㅑㅕㅛㅠ" },
      { no: 3, title: "이중모음 ㅔㅐ · ㅚㅙㅖㅒ" },
      { no: 4, title: "배운 자음·모음이 든 글자 읽기" },
    ],
  },
  {
    id: 9,
    stage: 5,
    title: "받침 ㅍ, ㄲ, ㅋ 배우기 + 읽기 이해 기초",
    days: 20,
    chapters: four("글자와 소리가 달라요: 받침 ㅍ", "글자와 소리가 달라요: 받침 ㄲㅋ"),
  },
  {
    id: 10,
    stage: 5,
    title: "받침 ㄷ, ㅌ 배우기 + 읽기 이해 기초",
    days: 20,
    chapters: four("받침 ㄷ", "글자와 소리가 달라요: 받침 ㅌ"),
  },
  {
    id: 11,
    stage: 5,
    title: "받침 ㅅ, ㅈ, ㅊ 배우기 + 읽기 이해 기초",
    days: 20,
    chapters: four("글자와 소리가 달라요: 받침 ㅅ", "글자와 소리가 달라요: 받침 ㅈㅊ"),
  },
  {
    id: 12,
    stage: 6,
    title: "여러 가지 받침이 들어간 글자 읽기 연습 + 읽기 이해 심화",
    days: 20,
    chapters: [
      { no: 1, title: "받침 ㅅ이 든 낱말" },
      { no: 2, title: "받침 ㅅ이 사라질 때 · 사이시옷" },
      { no: 3, title: "여러 받침이 든 낱말·문장 (1)" },
      { no: 4, title: "여러 받침이 든 낱말·문장 (2)" },
    ],
  },
  {
    id: 13,
    stage: 6,
    title: "받침 ㅎ을 배우고 헷갈리는 모음 익히기 + 읽기 이해 심화",
    days: 20,
    chapters: [
      { no: 1, title: "받침 ㅎ이 든 낱말·문장" },
      { no: 2, title: "받침 ㅎ이 소리 나지 않을 때" },
      { no: 3, title: "모음 ㅔㅐ가 든 낱말" },
      { no: 4, title: "모음 ㅚㅙㅖ가 든 낱말" },
    ],
  },
  { id: 14, stage: 6, title: "겹받침 배우기 + 읽기 이해 심화", days: 20, chapters: four("겹받침 ㄵㄼㄺㄻ", "겹받침 ㄶㅀㄾㅄ") },
];

/** 시작 수준 고르기 — 토도한글 '현재 수준' 6가지와 추천 시작 단원 */
export const START_LEVELS: StartLevel[] = [
  { unit: 1, label: "한글 공부 시작", desc: "한글 공부가 처음이고 글자 이름을 몰라요" },
  { unit: 3, label: "글자를 구분해요", desc: "글자 이름은 알지만 '사', '고리' 같은 글자는 못 읽어요" },
  { unit: 5, label: "쉬운 글자를 읽어요", desc: "받침 없는 글자는 읽지만 '담', '보석' 같은 받침 글자는 못 읽어요" },
  { unit: 7, label: "받침을 알아요", desc: "받침 글자는 읽지만 ㄱ/ㅋ/ㄲ, ㅔ/ㅐ처럼 비슷한 글자를 헷갈려요" },
  { unit: 9, label: "한글 파닉스 완성", desc: "모양대로 소리 나는 글자는 읽지만 '부엌', '늦어요'는 어려워요" },
  { unit: 12, label: "복잡한 받침을 알아요", desc: "복잡한 받침도 읽지만 맞춤법·읽기 이해를 더 다져요" },
];

export const DAYS_PER_CHAPTER = 5;

export function unitOutline(id: number): UnitOutline | undefined {
  return UNITS.find((u) => u.id === id);
}

export function stageOutline(id: number): StageOutline | undefined {
  return STAGES.find((s) => s.id === id);
}

/** 하루 → 몇 장인지 (1~5일 = 1장) */
export function chapterOfDay(day: number): number {
  return Math.ceil(day / DAYS_PER_CHAPTER);
}

/** 장 끝 날(5·10·15·20일)이 형성 평가 날 */
export function isAssessDay(day: number): boolean {
  return day % DAYS_PER_CHAPTER === 0;
}
