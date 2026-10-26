import type { ActivityKind } from "@/curriculum/types";

/** 활동 종류마다 아이 눈에 보이는 아이콘 — 오늘의 모험 순서 표시·미션 길 */
export const KIND_ICON: Record<ActivityKind, string> = {
  "tap-pop": "🎈",
  intro: "👋",
  "listen-choose": "👂",
  "find-same": "🔍",
  "drag-match": "✋",
  trace: "✏️",
  clap: "👏",
  "word-picture": "🖼️",
  book: "📖",
  "sound-match": "🔊",
  blend: "🔗",
  read: "📗",
};

/** 활동 이름 — 도전 안 놀이 길에 아이 말로 */
export const KIND_LABEL: Record<ActivityKind, string> = {
  "tap-pop": "방울 터뜨리기",
  intro: "글자 만나기",
  "listen-choose": "듣고 고르기",
  "find-same": "똑같은 것 찾기",
  "drag-match": "쏙 넣기",
  trace: "따라 쓰기",
  clap: "짝짝 손뼉",
  "word-picture": "그림 찾기",
  book: "책 읽기",
  "sound-match": "소리 짝꿍",
  blend: "소리 합치기",
  read: "읽고 고르기",
};
