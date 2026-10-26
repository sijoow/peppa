/**
 * 지금까지 배운 것 — 자유 모드·은하계 여행·작업실은 '배운 만큼'만 문제를 낸다.
 * 1·2단원은 지난 날들의 소개(intro)·듣고 고르기에 나온 글자·낱말을 모은다(하루치 days.ts 기준).
 * 3단원부터는 하루치를 아직 안 짜서 토도 과정표의 단원 목표로 넓힌다:
 *   3단원 기본 모음 소리 · 4단원 11일부터 받침 없는 글자 · 5단원부터 받침 글자.
 * 배운 게 모자라면(진도 초반·부모 미리 보기) preview 로 채운다.
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

import { dayPlan } from "./days.ts";
import { syllableGrid } from "./hangul.ts";
import { ANIMAL, FAMILY, FOOD, FRUIT } from "./words.ts";

export const CONSONANTS_14 = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
export const VOWELS_10 = ["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"];
export const BASIC_VOWELS = ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ"];
const STAGE1_WORDS = [...FRUIT, ...FOOD, ...ANIMAL, ...FAMILY];

export interface Learned {
  consonants: string[];
  vowels: string[];
  /** 통글자 낱말(그림이 있는 것) */
  words: string[];
  /** 받침 없는 글자(가 나 다 …) */
  syllables: string[];
}

export function learnedAt(unit: number, day: number): Learned {
  const consonants = new Set<string>();
  const vowels = new Set<string>();
  const words = new Set<string>();
  for (const u of [1, 2]) {
    const last = u < unit ? 99 : u === unit ? day - 1 : 0;
    for (let d = 1; d <= last; d++) {
      const plan = dayPlan(u, d);
      if (!plan) break;
      for (const a of plan.activities) {
        if (a.kind !== "intro" && a.kind !== "listen-choose") continue;
        for (const it of a.items) {
          if (CONSONANTS_14.includes(it)) consonants.add(it);
          else if (VOWELS_10.includes(it)) vowels.add(it);
          else words.add(it);
        }
      }
    }
  }
  if (unit >= 3) {
    CONSONANTS_14.forEach((c) => consonants.add(c));
    VOWELS_10.forEach((v) => vowels.add(v));
    STAGE1_WORDS.forEach((w) => words.add(w));
  }
  const readsSyllables = unit > 4 || (unit === 4 && day >= 11);
  return {
    consonants: [...consonants],
    vowels: [...vowels],
    words: [...words],
    syllables: readsSyllables ? syllableGrid(CONSONANTS_14, BASIC_VOWELS) : [],
  };
}

/** 미리 보기용 기본 내용 — 배운 게 모자랄 때 채운다 */
export const PREVIEW: Learned = {
  consonants: ["ㄱ", "ㄴ", "ㄷ", "ㄹ"],
  vowels: ["ㅏ", "ㅓ", "ㅗ", "ㅜ"],
  words: FRUIT.slice(0, 6),
  syllables: syllableGrid(["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ"], ["ㅏ", "ㅗ", "ㅣ"]),
};

/** 배운 목록이 n개보다 적으면 미리 보기로 채운다 */
export function atLeast(list: string[], fallback: string[], n: number): string[] {
  if (list.length >= n) return list;
  return [...new Set([...list, ...fallback])];
}
