/**
 * 활동 설계도(ActivitySpec) → 실제 판(문제·보기·방울 자리).
 * 무작위는 여기서만 쓴다 — 시작 버튼을 누를 때 한 번 섞고, 화면은 받은 판을 그대로 그린다.
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

import type { ActivityKind, ActivitySpec, DayPlan } from "../curriculum/types.ts";
import { isLetter } from "../curriculum/items.ts";
import { syllablesOf } from "../curriculum/words.ts";

export type Rng = () => number;

/** 씨앗이 같으면 같은 순서 — 테스트와 미리 보기가 쓴다 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 정답 하나 + 오답 (count-1)개, 섞어서. 모은 수가 모자라면 있는 만큼만 */
export function choicesFor(target: string, pool: readonly string[], count: number, rng: Rng): string[] {
  const others = shuffle([...new Set(pool)].filter((x) => x !== target), rng).slice(0, count - 1);
  return shuffle([target, ...others], rng);
}

export interface Round {
  target: string;
  choices: string[];
  /** 소리 찾기에서 들려주는 낱말(사과 → 정답 사자) */
  word?: string;
}

export interface ReadRound {
  text: string;
  question?: string;
  answer: string;
  choices: string[];
}

export interface Bubble {
  item: string;
  /** 판 안에서의 자리(%) */
  x: number;
  y: number;
  /** 크기 배율 */
  scale: number;
  /** 둥실거리는 박자 어긋남(초) */
  delay: number;
  /** 방울 색 번호 */
  hue: number;
}

export type BuiltActivity =
  | { kind: "tap-pop"; bubbles: Bubble[] }
  | { kind: "intro"; items: string[] }
  | { kind: "listen-choose"; rounds: Round[] }
  | { kind: "find-same"; rounds: Round[] }
  | { kind: "word-picture"; rounds: Round[] }
  | { kind: "drag-match"; screens: { targets: string[]; tokens: string[] }[] }
  | { kind: "trace"; items: string[] }
  | { kind: "clap"; rounds: { word: string; syllables: string[] }[] }
  | { kind: "book"; bookId: string }
  | { kind: "sound-match"; mode: "first" | "last"; rounds: Round[] }
  | { kind: "blend"; rounds: Round[] }
  | { kind: "read"; skin: "explain" | "find-me" | "read-answer"; rounds: ReadRound[] };

const SCORED: ActivityKind[] = ["listen-choose", "find-same", "word-picture", "drag-match", "clap", "sound-match", "blend", "read"];

/** 점수를 세는 활동인지 — 형성 평가 날에는 이것만 나온다 */
export function isScored(kind: ActivityKind): boolean {
  return SCORED.includes(kind);
}

/** 방울 자리 — 칸을 나눠 겹치지 않게 놓고 칸 안에서 조금씩 흔든다 */
function bubbles(items: string[], rng: Rng): Bubble[] {
  const n = items.length;
  const cols = Math.max(2, Math.ceil(Math.sqrt(n * 1.7)));
  const rows = Math.ceil(n / cols);
  const cells = shuffle(
    Array.from({ length: cols * rows }, (_, i) => i),
    rng,
  ).slice(0, n);
  return shuffle(items, rng).map((item, i) => {
    const c = cells[i] % cols;
    const r = Math.floor(cells[i] / cols);
    const jx = (rng() - 0.5) * 0.4;
    const jy = (rng() - 0.5) * 0.4;
    return {
      item,
      x: Math.min(90, Math.max(10, ((c + 0.5 + jx) / cols) * 100)),
      y: Math.min(85, Math.max(15, ((r + 0.5 + jy) / rows) * 100)),
      scale: 0.9 + rng() * 0.25,
      delay: rng() * 2,
      hue: Math.floor(rng() * 5),
    };
  });
}

/** 끌어 갈 카드 순서 — 위 자리와 같은 순서면 바로 아래로만 끌어도 맞으니 한 칸 돌린다 */
function tokensFor(targets: string[], rng: Rng): string[] {
  const t = shuffle(targets, rng);
  if (t.length > 1 && t.every((x, i) => x === targets[i])) return [...t.slice(1), t[0]];
  return t;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function buildActivity(spec: ActivitySpec, rng: Rng): BuiltActivity {
  switch (spec.kind) {
    case "tap-pop":
      return { kind: "tap-pop", bubbles: bubbles(spec.items, rng) };
    case "intro":
      return { kind: "intro", items: spec.items };
    case "listen-choose":
      return {
        kind: "listen-choose",
        rounds: shuffle(spec.items, rng).map((t) => ({ target: t, choices: choicesFor(t, spec.pool, 3, rng) })),
      };
    case "find-same":
      return {
        kind: "find-same",
        // 글자는 넷 중에서, 낱말은 카드가 커서 셋 중에서 찾는다
        rounds: shuffle(spec.items, rng).map((t) => ({ target: t, choices: choicesFor(t, spec.pool, isLetter(t) ? 4 : 3, rng) })),
      };
    case "word-picture":
      return {
        kind: "word-picture",
        rounds: shuffle(spec.items, rng).map((t) => ({ target: t, choices: choicesFor(t, spec.pool, 3, rng) })),
      };
    case "drag-match":
      return {
        kind: "drag-match",
        screens: chunk(shuffle(spec.items, rng), 3).map((group) => {
          const targets = shuffle(group, rng);
          return { targets, tokens: tokensFor(targets, rng) };
        }),
      };
    case "trace":
      return { kind: "trace", items: spec.items };
    case "clap":
      return { kind: "clap", rounds: shuffle(spec.items, rng).map((w) => ({ word: w, syllables: syllablesOf(w) })) };
    case "book":
      return { kind: "book", bookId: spec.bookId };
    case "sound-match":
      return {
        kind: "sound-match",
        mode: spec.mode,
        rounds: shuffle(spec.rounds, rng).map((r) => ({ word: r.word, target: r.answer, choices: shuffle([r.answer, ...r.others], rng) })),
      };
    case "blend":
      return { kind: "blend", rounds: shuffle(spec.items, rng).map((t) => ({ target: t, choices: choicesFor(t, spec.pool, 3, rng) })) };
    case "read":
      return { kind: "read", skin: spec.skin, rounds: shuffle(spec.rounds, rng).map((r) => ({ ...r, choices: shuffle(r.choices, rng) })) };
  }
}

export function buildSession(plan: DayPlan, rng: Rng): BuiltActivity[] {
  return plan.activities.map((a) => buildActivity(a, rng));
}
