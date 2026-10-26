/**
 * 오늘의 모험 밖의 메뉴 — 토도한글의 자유 모드 · 작업실 · 은하계 여행 (이름은 토도 그대로).
 * 토도가 공개한 것: 자유 모드는 5영역 15종이고 진도에 따라 열린다, 작업실은 반딧불이를 모으면 하나씩 열린다,
 *   은하계 여행은 시간·실패 제한이 있고 기준을 넘어야 다음으로, 하루 5번.
 * 공개 안 된 것(놀이 규칙·열리는 지점·필요한 반딧불이 수)은 이름과 영역에 맞춰 우리가 정했다.
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

export interface Opens {
  unit: number;
  day: number;
}

export type FreeArea = "phonics" | "writing" | "compose" | "spelling" | "reading";

export const FREE_AREAS: { id: FreeArea; title: string; tone: string }[] = [
  // 이름은 아이 말로(2026-10-26 — 토도 이름 파닉스·맞춤법·읽기 이해 대신)
  { id: "phonics", title: "소리 놀이", tone: "peach" },
  { id: "writing", title: "쓰기 놀이", tone: "butter" },
  { id: "compose", title: "글자 만들기", tone: "mint" },
  { id: "spelling", title: "받아쓰기", tone: "sky" },
  { id: "reading", title: "읽기 놀이", tone: "lilac" },
];

export type FreeGameId =
  | "sound-station"
  | "letter-mine"
  | "letter-wheel"
  | "trace"
  | "free-write"
  | "word-card"
  | "rhythm"
  | "assemble"
  | "cauldron"
  | "word-soccer"
  | "listen-pick"
  | "pieces"
  | "explain"
  | "find-me"
  | "read-answer";

export interface FreeGame {
  id: FreeGameId;
  area: FreeArea;
  title: string;
  icon: string;
  desc: string;
  opens: Opens;
}

export const FREE_GAMES: FreeGame[] = [
  { id: "sound-station", area: "phonics", title: "말소리 정류장", icon: "🚌", desc: "버스 손님이 말한 소리의 첫 자음 정류장 고르기", opens: { unit: 3, day: 11 } },
  { id: "letter-mine", area: "phonics", title: "으랏차 글자 광산", icon: "⛏️", desc: "들은 글자가 든 바위를 톡톡 깨서 꺼내기", opens: { unit: 1, day: 7 } },
  { id: "letter-wheel", area: "phonics", title: "돌려라 글자판", icon: "🎡", desc: "자음판·모음판을 돌려 들은 글자 만들기", opens: { unit: 4, day: 11 } },
  { id: "trace", area: "writing", title: "따라쓰기", icon: "✏️", desc: "배운 글자를 손가락으로 따라 쓰기", opens: { unit: 1, day: 1 } },
  { id: "free-write", area: "writing", title: "글자를 써보자", icon: "📝", desc: "글자를 보고 기억해서 혼자 써 보기", opens: { unit: 1, day: 7 } },
  { id: "word-card", area: "writing", title: "손글씨 낱말 카드", icon: "🃏", desc: "그림 낱말을 따라 써서 카드 모으기", opens: { unit: 2, day: 2 } },
  { id: "rhythm", area: "compose", title: "리듬 한글", icon: "🥁", desc: "박자에 맞춰 날아오는 글자를 톡톡", opens: { unit: 4, day: 11 } },
  { id: "assemble", area: "compose", title: "모여라 자음 모음", icon: "🧩", desc: "자음과 모음을 제자리에 넣어 글자 완성", opens: { unit: 4, day: 11 } },
  { id: "cauldron", area: "compose", title: "마법의 솥", icon: "🧪", desc: "자음과 모음을 솥에 넣고 저어 글자 만들기", opens: { unit: 4, day: 11 } },
  { id: "word-soccer", area: "spelling", title: "단어 축구", icon: "⚽", desc: "들은 낱말이 적힌 골대로 공 차기", opens: { unit: 2, day: 2 } },
  { id: "listen-pick", area: "spelling", title: "듣고 글자 고르기", icon: "👂", desc: "듣고 맞는 글자 고르기", opens: { unit: 1, day: 7 } },
  { id: "pieces", area: "spelling", title: "조각 조각 붙여요", icon: "🧷", desc: "글자 조각을 차례로 붙여 낱말 완성", opens: { unit: 2, day: 6 } },
  { id: "explain", area: "reading", title: "설명해 주세요", icon: "💬", desc: "설명을 읽고 맞는 그림 고르기", opens: { unit: 9, day: 1 } },
  { id: "find-me", area: "reading", title: "나를 찾아줘", icon: "🔎", desc: "문장을 읽고 그림 속 친구 찾기", opens: { unit: 9, day: 1 } },
  { id: "read-answer", area: "reading", title: "읽고 답해요", icon: "📖", desc: "짧은 글을 읽고 물음에 답하기", opens: { unit: 12, day: 1 } },
];

export type StudioId = "draw" | "color" | "letter-color" | "word-write" | "sentence-write" | "card";

/** 작업실 — 토도 순서 그대로, 모은 반딧불이(누적)가 need 를 넘으면 열린다 */
export const STUDIO: { id: StudioId; title: string; icon: string; need: number }[] = [
  { id: "draw", title: "자유 그리기", icon: "🖍️", need: 0 },
  { id: "color", title: "색칠하기", icon: "🎨", need: 10 },
  { id: "letter-color", title: "글자 색칠하기", icon: "🔤", need: 30 },
  { id: "word-write", title: "낱말 쓰기 연습", icon: "✍️", need: 60 },
  { id: "sentence-write", title: "문장 쓰기 연습", icon: "📜", need: 100 },
  { id: "card", title: "카드 쓰기", icon: "💌", need: 150 },
];

export type GalaxyKind = "pick" | "word-quiz" | "word-find" | "type";

export interface Galaxy {
  id: string;
  title: string;
  kind: GalaxyKind;
  /** 낱말 찾기 2·타자 2 처럼 같은 놀이의 어려운 판 */
  level: 1 | 2;
  icon: string;
  opens: Opens;
}

/** 은하계 여행 — 은하마다 행성(스테이지) 5개. 토도 캡션의 은하 6개 */
export const GALAXIES: Galaxy[] = [
  { id: "pick", title: "글자 고르기 은하", kind: "pick", level: 1, icon: "🪐", opens: { unit: 1, day: 7 } },
  { id: "type-1", title: "타자 연습 은하 1", kind: "type", level: 1, icon: "⌨️", opens: { unit: 2, day: 1 } },
  { id: "word-quiz", title: "낱말 퀴즈 은하", kind: "word-quiz", level: 1, icon: "🌟", opens: { unit: 2, day: 6 } },
  { id: "word-find-1", title: "낱말 찾기 은하 1", kind: "word-find", level: 1, icon: "🔭", opens: { unit: 2, day: 11 } },
  { id: "type-2", title: "타자 연습 은하 2", kind: "type", level: 2, icon: "🚀", opens: { unit: 4, day: 11 } },
  { id: "word-find-2", title: "낱말 찾기 은하 2", kind: "word-find", level: 2, icon: "☄️", opens: { unit: 6, day: 1 } },
];

export const GALAXY_STAGES = 5;
/** 스테이지 n(1~5)의 규칙 — 60초, 목숨 3개, 목표 개수는 점점 많게 */
export function stageRule(stage: number): { seconds: number; lives: number; goal: number } {
  return { seconds: 60, lives: 3, goal: [5, 6, 7, 8, 10][stage - 1] ?? 10 };
}
