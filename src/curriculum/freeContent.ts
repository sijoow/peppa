/**
 * 자유 모드 놀이판 만들기 — 놀이 15종마다 '배운 만큼'(learned.ts)의 글자·낱말로 문제를 만든다.
 * 무작위는 rng 로만 — 같은 씨앗이면 같은 판(테스트).
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

import { compose, decompose, syllableGrid } from "./hangul.ts";
import { atLeast, BASIC_VOWELS, PREVIEW, type Learned } from "./learned.ts";
import type { FreeGameId } from "./modes.ts";
import { EXPLAIN, FIND_ME, READ_ANSWER } from "./reading.ts";
import { choicesFor, shuffle, type Rng, type Round } from "../lib/rounds.ts";

export interface PickRound {
  /** 들려줄 말 */
  say: string;
  answer: string;
  choices: string[];
}

export interface ComposeRound {
  target: string;
  consonants: string[];
  vowels: string[];
}

export type FreeBuilt =
  | { kind: "pick"; skin: "mine" | "station" | "soccer"; rounds: PickRound[] }
  | { kind: "listen"; rounds: Round[] }
  | { kind: "trace"; items: string[]; mode: "trace" | "free" }
  | { kind: "word-card"; items: string[] }
  | { kind: "pieces"; rounds: { word: string; tiles: string[] }[] }
  | { kind: "wheel" | "assemble" | "cauldron"; rounds: ComposeRound[] }
  | { kind: "rhythm"; notes: string[] }
  | { kind: "read"; skin: "explain" | "find-me" | "read-answer"; rounds: { text: string; question?: string; answer: string; choices: string[] }[] };

const take = <T>(arr: T[], n: number, rng: Rng) => shuffle(arr, rng).slice(0, n);

/** 배운 글자(자음+모음)·낱말·받침 없는 글자 — 모자라면 미리 보기로 */
function pools(l: Learned) {
  const jamo = atLeast([...l.consonants, ...l.vowels], [...PREVIEW.consonants, ...PREVIEW.vowels], 4);
  const words = atLeast(l.words, PREVIEW.words, 4);
  const syllables = atLeast(l.syllables, PREVIEW.syllables, 6);
  const consonants = atLeast(l.consonants, PREVIEW.consonants, 4);
  return { jamo, words, syllables, consonants };
}

/** 글자 만들기 판 — 정답 글자의 자음·모음이 꼭 들어간 보기 */
function composeRounds(syllables: string[], consonants: string[], n: number, nCons: number, nVow: number, rng: Rng): ComposeRound[] {
  return take(syllables, n, rng).map((target) => {
    const parts = decompose(target);
    const cho = parts?.cho ?? "ㄱ";
    const jung = parts?.jung ?? "ㅏ";
    return {
      target,
      consonants: shuffle([cho, ...take(consonants.filter((c) => c !== cho), nCons - 1, rng)], rng),
      vowels: shuffle([jung, ...take(BASIC_VOWELS.filter((v) => v !== jung), nVow - 1, rng)], rng),
    };
  });
}

export function buildFreeGame(id: FreeGameId, learned: Learned, rng: Rng): FreeBuilt {
  const p = pools(learned);
  switch (id) {
    case "letter-mine":
      return { kind: "pick", skin: "mine", rounds: take(p.jamo, 5, rng).map((t) => ({ say: t, answer: t, choices: choicesFor(t, p.jamo, 4, rng) })) };
    case "word-soccer":
      return { kind: "pick", skin: "soccer", rounds: take(p.words, 5, rng).map((t) => ({ say: t, answer: t, choices: choicesFor(t, p.words, 3, rng) })) };
    case "sound-station": {
      // 들려준 글자(가)의 첫 자음(ㄱ) 정류장 고르기
      const syls = p.syllables.filter((s) => decompose(s)?.cho !== "ㅇ");
      return {
        kind: "pick",
        skin: "station",
        rounds: take(syls, 5, rng).map((s) => {
          const cho = decompose(s)?.cho ?? "ㄱ";
          return { say: s, answer: cho, choices: choicesFor(cho, p.consonants.filter((c) => c !== "ㅇ"), 3, rng) };
        }),
      };
    }
    case "listen-pick":
      return { kind: "listen", rounds: take(p.jamo, 5, rng).map((t) => ({ target: t, choices: choicesFor(t, p.jamo, 3, rng) })) };
    case "trace":
      return { kind: "trace", items: take(p.jamo, 3, rng), mode: "trace" };
    case "free-write":
      return { kind: "trace", items: take(p.jamo, 3, rng), mode: "free" };
    case "word-card":
      return { kind: "word-card", items: take(p.words, 3, rng) };
    case "pieces":
      return {
        kind: "pieces",
        rounds: take(
          p.words.filter((w) => [...w].length >= 2),
          4,
          rng,
        ).map((word) => {
          const syl = [...word];
          let tiles = shuffle(syl, rng);
          // 처음부터 맞는 순서면 놀이가 안 된다 — 한 칸 돌린다
          if (tiles.join("") === word) tiles = [...tiles.slice(1), tiles[0]];
          return { word, tiles };
        }),
      };
    case "letter-wheel":
      return { kind: "wheel", rounds: composeRounds(p.syllables, p.consonants, 4, 5, 4, rng) };
    case "assemble":
      return { kind: "assemble", rounds: composeRounds(p.syllables, p.consonants, 4, 2, 2, rng) };
    case "cauldron":
      return { kind: "cauldron", rounds: composeRounds(p.syllables, p.consonants, 4, 4, 4, rng) };
    case "rhythm": {
      // 한 모음으로 자음을 차례로 — 가 나 다 라 … 노래처럼
      const v = take(BASIC_VOWELS, 1, rng)[0];
      const notes = syllableGrid(p.consonants.slice(0, 8), [v]);
      return { kind: "rhythm", notes };
    }
    case "explain":
      return { kind: "read", skin: "explain", rounds: take(EXPLAIN, 4, rng).map((r) => ({ ...r, choices: shuffle(r.choices, rng) })) };
    case "find-me":
      return { kind: "read", skin: "find-me", rounds: take(FIND_ME, 4, rng).map((r) => ({ ...r, choices: shuffle(r.choices, rng) })) };
    case "read-answer":
      return { kind: "read", skin: "read-answer", rounds: take(READ_ANSWER, 3, rng).map((r) => ({ ...r, choices: shuffle(r.choices, rng) })) };
  }
}

/** 글자 만들기 — 고른 자음·모음으로 만든 글자 */
export function makeSyllable(cho: string, jung: string): string {
  return compose(cho, jung) ?? "";
}
