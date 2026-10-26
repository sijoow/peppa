/**
 * 커리큘럼 자료형 — 토도한글과 같은 틀: 단계 → 단원 → 장(5일) → 하루.
 * 하루치(오늘의 모험) = 학습 활동 5~6개 + 오늘의 책 1권. 장이 끝나는 5일째는 형성 평가.
 *
 * 글자(ㄱ)·낱말(사과)은 문자열 그대로 담는다. 이름(기역)·그림은 jamo.ts / words.ts 에서 찾는다.
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

import type { CastId } from "./cast.ts";

export type ActivitySpec =
  /** 방울을 눌러 터뜨리면 글자 이름·낱말을 들려준다 — 기기 익히기 + 눈에 익히기 (점수 없음) */
  | { kind: "tap-pop"; items: string[] }
  /** 글자 친구 만나기 / 낱말 카드 — 한 장씩 보여 주고 읽어 준다 (점수 없음) */
  | { kind: "intro"; items: string[] }
  /** 듣고 글자 고르기 — 이름(낱말)을 듣고 맞는 카드를 고른다 */
  | { kind: "listen-choose"; items: string[]; pool: string[] }
  /** 똑같은 모양 찾기 — 위에 보이는 것과 같은 글자(낱말)를 고른다 */
  | { kind: "find-same"; items: string[]; pool: string[] }
  /** 쏙쏙 넣기 — 글자는 같은 그림자에, 낱말은 맞는 그림에 끌어다 넣는다 */
  | { kind: "drag-match"; items: string[] }
  /** 따라쓰기 — 손가락으로 글자를 따라 그린다 (점수 없음) */
  | { kind: "trace"; items: string[] }
  /** 말소리 짝짝 — 낱말을 듣고 소리 마디(음절) 수만큼 손뼉 — 음운 인식 */
  | { kind: "clap"; items: string[] }
  /** 낱말 보고 그림 찾기 — 통글자 낱말을 보고 맞는 그림을 고른다 */
  | { kind: "word-picture"; items: string[]; pool: string[] }
  /** 오늘의 책 — 읽어 주기 (점수 없음) */
  | { kind: "book"; bookId: string }
  /** 처음(끝) 소리가 같은 그림 찾기 — 음운 인식: 사과 → 사자 / 하마 → 치마 */
  | { kind: "sound-match"; mode: "first" | "last"; rounds: { word: string; answer: string; others: string[] }[] }
  /** 소리 합치기 — "사…과" 나눠 들은 소리를 합친 그림 고르기 */
  | { kind: "blend"; items: string[]; pool: string[] }
  /** 읽기 이해 — 설명·문장·짧은 글을 읽고 고르기 (미션 '읽고 이해하기') */
  | { kind: "read"; skin: "explain" | "find-me" | "read-answer"; rounds: { text: string; question?: string; answer: string; choices: string[] }[] };

export type ActivityKind = ActivitySpec["kind"];

export interface DayPlan {
  unit: number;
  day: number;
  chapter: number;
  title: string;
  /** 형성 평가 날 — 힌트·다시 하기 없이 첫 시도만 점수로 센다 */
  assess: boolean;
  activities: ActivitySpec[];
}

export interface ChapterOutline {
  no: number;
  title: string;
}

export interface UnitOutline {
  id: number;
  stage: number;
  title: string;
  /** 기본 학습 일수 — 1단원만 10일(2장), 나머지는 20일(4장) */
  days: number;
  chapters: ChapterOutline[];
}

export interface StageOutline {
  id: number;
  title: string;
  /** 토도한글이 단계마다 내세우는 학습 주제 */
  topics: string[];
}

export interface StartLevel {
  unit: number;
  label: string;
  desc: string;
}

export interface BookPage {
  /** 그림 자리 — 지금은 이모지·글자. 힉스필드 그림이 생기면 image-manifest 가 덮는다 */
  art: string;
  text: string;
}

export interface Book {
  id: string;
  title: string;
  /** 이 책 그림에 나오는 인물(curriculum/cast) — 힉스필드 장면 그림 프롬프트에 쓴다 */
  cast?: CastId[];
  pages: BookPage[];
}
