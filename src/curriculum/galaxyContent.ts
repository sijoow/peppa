/**
 * 은하계 여행 문제 — 시간·목숨이 있는 도전. 은하 종류마다 배운 만큼(learned)의 글자·낱말로 한 문제씩 만든다.
 *   글자 고르기   들은 글자 이름 → 떠다니는 글자 중에서
 *   낱말 퀴즈     그림 → 맞는 낱말
 *   낱말 찾기     보이는 낱말과 똑같은 낱말을 떠다니는 것 중에서 (2는 첫 글자가 같은 헷갈리는 보기)
 *   타자 연습     1 자모 자판 찾기 / 2 자음+모음 눌러 글자 만들기
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

import { decompose } from "./hangul.ts";
import { emojiOf, speakOf } from "./items.ts";
import { atLeast, PREVIEW, type Learned } from "./learned.ts";
import type { Galaxy } from "./modes.ts";
import { choicesFor, shuffle, type Rng } from "../lib/rounds.ts";
import { WORDS } from "./words.ts";

/** 두벌식 자판 (윗글쇠 없이) — 왼쪽 자음, 오른쪽 모음 */
export const KEYBOARD = [
  ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ"],
  ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"],
  ["ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ"],
];
const KEYS = KEYBOARD.flat();

export interface GalaxyQuestion {
  /** 들려줄 말 */
  say: string[];
  /** 보여 줄 것(그림·낱말·글자) — 없으면 듣기만 */
  show?: { kind: "picture" | "text"; value: string };
  answer: string;
  /** 고를 보기 — 타자 연습은 자판이라 비어 있다 */
  choices: string[];
  /** 타자 2: 눌러야 할 자모 차례 */
  keys?: string[];
}

/** 그림이 있는 낱말 — 배운 낱말이 모자라면 1단계 낱말로 */
function pictureWords(l: Learned): string[] {
  return atLeast(
    l.words.filter((w) => emojiOf(w)),
    PREVIEW.words,
    6,
  );
}

const ALL_PICTURE_WORDS = WORDS.map((w) => w.text);

export function galaxyQuestion(g: Galaxy, stage: number, l: Learned, rng: Rng): GalaxyQuestion {
  const n = Math.min(9, 3 + stage); // 스테이지가 오를수록 보기가 많아진다
  switch (g.kind) {
    case "pick": {
      const pool = atLeast([...l.consonants, ...l.vowels], [...PREVIEW.consonants, ...PREVIEW.vowels], n);
      const answer = shuffle(pool, rng)[0];
      return { say: [speakOf(answer)], answer, choices: choicesFor(answer, pool, n + 1, rng) };
    }
    case "word-quiz": {
      const pool = pictureWords(l);
      const answer = shuffle(pool, rng)[0];
      return { say: [], show: { kind: "picture", value: answer }, answer, choices: choicesFor(answer, pool, 3, rng) };
    }
    case "word-find": {
      const pool = g.level === 1 ? pictureWords(l) : ALL_PICTURE_WORDS;
      const answer = shuffle(pool, rng)[0];
      // 2: 첫 글자가 같은 낱말을 먼저 보기로 — 헷갈리게
      const alike = g.level === 2 ? pool.filter((w) => w !== answer && w[0] === answer[0]) : [];
      const choices = shuffle([answer, ...shuffle(alike, rng).slice(0, 2), ...shuffle(pool.filter((w) => w !== answer && !alike.includes(w)), rng)].slice(0, n), rng);
      return { say: [], show: { kind: "text", value: answer }, answer, choices: [...new Set(choices)] };
    }
    case "type": {
      if (g.level === 1) {
        const pool = atLeast([...l.consonants, ...l.vowels], [...PREVIEW.consonants, ...PREVIEW.vowels], 4).filter((k) => KEYS.includes(k));
        const answer = shuffle(pool, rng)[0];
        return { say: [speakOf(answer)], show: { kind: "text", value: answer }, answer, choices: [], keys: [answer] };
      }
      const pool = atLeast(l.syllables, PREVIEW.syllables, 6).filter((s) => {
        const d = decompose(s);
        return d && KEYS.includes(d.cho) && KEYS.includes(d.jung);
      });
      const answer = shuffle(pool, rng)[0];
      const d = decompose(answer);
      return { say: [answer], show: { kind: "text", value: answer }, answer, choices: [], keys: d ? [d.cho, d.jung] : [] };
    }
  }
}
