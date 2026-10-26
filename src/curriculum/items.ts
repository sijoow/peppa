/**
 * 활동에 담기는 '항목'(글자 ㄱ 또는 낱말 사과) → 읽어 줄 말 · 그림.
 * 글자는 이름(기역)을 읽고, 낱말은 낱말 그대로 읽는다. 그림은 낱말에만 있다.
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

import { isHangulWord } from "./hangul.ts";
import { isJamo, jamoOf } from "./jamo.ts";
import { wordOf } from "./words.ts";

export function isLetter(item: string): boolean {
  return isJamo(item);
}

/** 읽어 줄 말 — ㄱ → "기역", 사과 → "사과" */
export function speakOf(item: string): string {
  return jamoOf(item)?.name ?? item;
}

/** 임시 그림(이모지) — 낱말에만 있다 */
export function emojiOf(item: string): string | undefined {
  return wordOf(item)?.emoji;
}

/** 커리큘럼에 실린 항목인지 — 자모, 낱말 사전, 또는 한글 글자로만 된 낱말(가·감·사과 …) */
export function isKnownItem(item: string): boolean {
  return isJamo(item) || wordOf(item) !== undefined || isHangulWord(item);
}
