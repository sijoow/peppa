/**
 * 하루치 학습(오늘의 모험) — 1단계 1~2단원 30일.
 *
 * 토도한글 공개 자료에는 단원·장(5일)까지만 있고 하루하루의 활동 구성은 없다. 그래서 장의 목표에 맞춰 우리가 짰다:
 *   하루 = 활동 5개 + 오늘의 책 1권(토도: 책 1권 + 활동 5~6개, 10~15분). 장 끝 5일째는 형성 평가(점수 활동만).
 *   1단원 1장 — 기기 익히기(누르기·끌기·선 긋기) + 글자 모양 눈에 익히기 + 말소리 짝짝(음운 인식)
 *   1단원 2장 — 글자 이름: ㄱㄴㄷㄹ → ㅁㅂㅅㅇㅈ → ㅊㅋㅌㅍㅎ → 모음 (토도 미션 03~07 순서)
 *   2단원     — 통글자 낱말: 과일·야채 → 음식 → 동물 → 가족·옷, 장마다 낱말 8개를 3·3·2개씩 소개하고 4일째 모아서 연습
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

import { bookOf } from "./books.ts";
import { chapterOfDay, isAssessDay, unitOutline } from "./outline.ts";
import type { ActivitySpec, DayPlan } from "./types.ts";
import { ANIMAL, FAMILY, FOOD, FRUIT } from "./words.ts";

const G1 = ["ㄱ", "ㄴ", "ㄷ", "ㄹ"];
const G2 = ["ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ"];
const G3 = ["ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const CONS = [...G1, ...G2, ...G3];
const VOW = ["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"];

const tap = (items: string[]): ActivitySpec => ({ kind: "tap-pop", items });
const intro = (items: string[]): ActivitySpec => ({ kind: "intro", items });
const listen = (items: string[], pool: string[]): ActivitySpec => ({ kind: "listen-choose", items, pool });
const same = (items: string[], pool: string[]): ActivitySpec => ({ kind: "find-same", items, pool });
const drag = (items: string[]): ActivitySpec => ({ kind: "drag-match", items });
const trace = (items: string[]): ActivitySpec => ({ kind: "trace", items });
const clap = (items: string[]): ActivitySpec => ({ kind: "clap", items });
const picture = (items: string[], pool: string[]): ActivitySpec => ({ kind: "word-picture", items, pool });
const book = (bookId: string): ActivitySpec => ({ kind: "book", bookId });

type DayDraft = { title: string; activities: ActivitySpec[] };

/** 1단원 — 낱글자의 모양과 이름을 눈에 익히며 한글 학습 준비 (10일) */
const UNIT1: DayDraft[] = [
  // 1장 — 글자 학습 준비 (기기 익히기)
  {
    title: "글자 방울 톡톡",
    activities: [tap(G1), same(["ㄱ", "ㄴ", "ㄷ"], G1), drag(["ㄱ", "ㄴ", "ㄷ"]), trace(["ㅡ", "ㅣ"]), clap(["곰", "사과", "배", "토끼"]), book("letters-1")],
  },
  {
    title: "모양이 달라요",
    activities: [tap(G2), same(["ㅁ", "ㅅ", "ㅇ", "ㄹ"], [...G1, ...G2]), drag(["ㅁ", "ㅇ", "ㅅ"]), trace(["ㄱ", "ㄴ"]), clap(["포도", "말", "바나나", "오리"]), book("letters-2")],
  },
  {
    title: "글자 그림자 찾기",
    activities: [tap(G3), same(["ㅋ", "ㅌ", "ㅍ", "ㅎ"], CONS), drag(["ㅋ", "ㅍ", "ㅎ"]), trace(["ㅇ", "ㅅ"]), clap(["고양이", "소", "기린", "코끼리"]), book("letters-3")],
  },
  {
    title: "모음 친구 톡톡",
    activities: [tap(VOW), same(["ㅏ", "ㅓ", "ㅗ", "ㅜ"], VOW), drag(["ㅏ", "ㅗ", "ㅣ"]), trace(["ㅏ", "ㅗ"]), clap(["별", "강아지", "하마", "원숭이"]), book("letters-4")],
  },
  {
    title: "확인 놀이",
    activities: [
      same(["ㄷ", "ㅂ", "ㅈ", "ㅊ"], CONS),
      drag(["ㄹ", "ㅁ", "ㅎ"]),
      same(["ㅑ", "ㅕ", "ㅠ"], VOW),
      drag(["ㅓ", "ㅜ", "ㅡ"]),
      clap(["달", "시계", "호랑이", "꽃"]),
      book("letters-1"),
    ],
  },
  // 2장 — 서로 다른 글자 구분, 글자 이름 익히기
  {
    title: "기역 니은 디귿 리을",
    activities: [intro(G1), listen(G1, G1), same(G1, CONS), trace(["ㄱ", "ㄴ"]), clap(["해", "버스", "비행기", "사자"]), book("letters-1")],
  },
  {
    title: "미음 비읍 시옷 이응 지읒",
    activities: [intro(G2), listen(G2, G2), tap([...G1, ...G2]), trace(["ㄷ", "ㅁ"]), clap(["꽃", "딸기", "고양이", "소"]), book("letters-2")],
  },
  {
    title: "치읓 키읔 티읕 피읖 히읗",
    activities: [intro(G3), listen(G3, G3), same(G3, CONS), trace(["ㅂ", "ㅇ"]), clap(["빵", "우유", "원숭이", "말"]), book("letters-3")],
  },
  {
    title: "모음 이름 익히기",
    activities: [intro(VOW), listen(["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ"], VOW), tap(VOW), trace(["ㅏ", "ㅓ"]), clap(["밥", "모자", "호랑이", "배"]), book("letters-4")],
  },
  {
    title: "확인 놀이",
    activities: [
      listen(["ㄱ", "ㅁ", "ㅅ", "ㅇ", "ㅎ"], CONS),
      listen(["ㅏ", "ㅗ", "ㅣ"], VOW),
      same(["ㄹ", "ㅈ", "ㅋ"], CONS),
      drag(["ㄴ", "ㅂ", "ㅊ"]),
      clap(["곰", "시계", "바나나", "달"]),
      book("letters-2"),
    ],
  },
];

/** 2단원 한 장(5일) — 주제 낱말 8개(w0~w7)와 그 주제 책 두 권 */
function themeChapter(name: string, w: string[], book1: string, book2: string): DayDraft[] {
  const [w0, w1, w2, w3, w4, w5, w6, w7] = w;
  return [
    {
      title: `${name} 낱말 만나기`,
      activities: [intro([w0, w1, w2]), picture([w0, w1, w2], w), same([w0, w1, w2], w), tap([w0, w1, w2]), clap([w0, w1, w2]), book(book1)],
    },
    {
      title: `${name} 낱말 더 만나기`,
      activities: [intro([w3, w4, w5]), picture([w3, w4, w5], w), listen([w1, w3, w4, w5], w), drag([w3, w4, w5]), clap([w3, w4, w5]), book(book2)],
    },
    {
      title: `${name} 낱말 다 모였다`,
      activities: [intro([w6, w7]), picture([w6, w7, w0, w2], w), listen([w6, w7, w2], w), same([w4, w6, w7], w), drag([w6, w7, w1]), book(book1)],
    },
    {
      title: `${name} 낱말 놀이`,
      activities: [listen([w0, w3, w5, w7], w), picture([w1, w4, w6], w), drag([w0, w2, w5]), same([w1, w3, w5], w), tap(w), book(book2)],
    },
    {
      title: "확인 놀이",
      activities: [picture([w0, w2, w4, w6], w), listen([w1, w3, w5, w7], w), same([w2, w5, w6], w), drag([w3, w4, w7]), clap([w0, w5, w7]), book(book1)],
    },
  ];
}

/** 2단원 — 주제별 낱말을 눈에 익히면서 파닉스 학습 준비 (20일) */
const UNIT2: DayDraft[] = [
  ...themeChapter("과일·채소", FRUIT, "fruit-1", "fruit-2"),
  ...themeChapter("음식", FOOD, "food-1", "food-2"),
  ...themeChapter("동물", ANIMAL, "animal-1", "animal-2"),
  ...themeChapter("가족·옷", FAMILY, "family-1", "family-2"),
];

const DRAFTS: Record<number, DayDraft[]> = { 1: UNIT1, 2: UNIT2 };

/** 하루치를 다 짜 둔 단원 — 나머지 단원은 '준비 중' */
export const BUILT_UNITS = Object.keys(DRAFTS).map(Number);

export function hasContent(unit: number): boolean {
  return unit in DRAFTS;
}

export function dayPlan(unit: number, day: number): DayPlan | null {
  const draft = DRAFTS[unit]?.[day - 1];
  if (!draft) return null;
  return {
    unit,
    day,
    chapter: chapterOfDay(day),
    title: draft.title,
    assess: isAssessDay(day),
    activities: draft.activities,
  };
}

/** 단원의 모든 하루 — 부모 페이지 '미리 보기'와 테스트가 쓴다 */
export function unitDays(unit: number): DayPlan[] {
  const days = unitOutline(unit)?.days ?? 0;
  const out: DayPlan[] = [];
  for (let d = 1; d <= days; d++) {
    const p = dayPlan(unit, d);
    if (p) out.push(p);
  }
  return out;
}

/** 책이 실제로 있는지 — 테스트용 */
export function missingBooks(): string[] {
  const ids = Object.values(DRAFTS)
    .flat()
    .flatMap((d) => d.activities)
    .flatMap((a) => (a.kind === "book" ? [a.bookId] : []));
  return [...new Set(ids)].filter((id) => !bookOf(id));
}
