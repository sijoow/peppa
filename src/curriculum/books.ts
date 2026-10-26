/**
 * 오늘의 책 — 1단계(1~2단원) 시작 책 12권.
 * 토도한글 도서관(200여 권)을 대신할 우리 책. 1단원은 글자 그림책, 2단원은 주제마다 두 권(낱말 그림책 + 짧은 이야기).
 * 주인공은 페파 가족(curriculum/cast) — 페파가 글자 친구와 가족을 소개하고, 이야기는 페파·조지가 이끈다.
 * 그림은 지금 이모지·글자로 대신하고, 힉스필드 그림이 생기면 image-manifest.json 이 덮는다(lib/assets).
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

import type { Book } from "./types.ts";

export const BOOKS: Book[] = [
  {
    id: "letters-1",
    title: "ㄱ ㄴ ㄷ ㄹ 친구",
    cast: ["peppa"],
    pages: [
      { art: "ㄱ", text: "기역" },
      { art: "ㄴ", text: "니은" },
      { art: "ㄷ", text: "디귿" },
      { art: "ㄹ", text: "리을" },
      { art: "🤗", text: "안녕, 글자 친구들!" },
    ],
  },
  {
    id: "letters-2",
    title: "ㅁ ㅂ ㅅ ㅇ ㅈ 친구",
    cast: ["peppa"],
    pages: [
      { art: "ㅁ", text: "미음" },
      { art: "ㅂ", text: "비읍" },
      { art: "ㅅ", text: "시옷" },
      { art: "ㅇ", text: "이응" },
      { art: "ㅈ", text: "지읒" },
      { art: "🎈", text: "우리 같이 놀자!" },
    ],
  },
  {
    id: "letters-3",
    title: "ㅊ ㅋ ㅌ ㅍ ㅎ 친구",
    cast: ["peppa"],
    pages: [
      { art: "ㅊ", text: "치읓" },
      { art: "ㅋ", text: "키읔" },
      { art: "ㅌ", text: "티읕" },
      { art: "ㅍ", text: "피읖" },
      { art: "ㅎ", text: "히읗" },
      { art: "🎉", text: "자음 친구 다 모였다!" },
    ],
  },
  {
    id: "letters-4",
    title: "모음 친구",
    cast: ["peppa"],
    pages: [
      { art: "ㅏ", text: "아" },
      { art: "ㅑ", text: "야" },
      { art: "ㅓ", text: "어" },
      { art: "ㅕ", text: "여" },
      { art: "ㅗ", text: "오" },
      { art: "ㅛ", text: "요" },
      { art: "ㅜ", text: "우" },
      { art: "ㅠ", text: "유" },
      { art: "ㅡ", text: "으" },
      { art: "ㅣ", text: "이" },
      { art: "🌈", text: "모음 친구 안녕!" },
    ],
  },
  {
    id: "fruit-1",
    title: "냠냠 과일 채소",
    cast: ["peppa", "george"],
    pages: [
      { art: "🍎", text: "사과" },
      { art: "🍌", text: "바나나" },
      { art: "🍇", text: "포도" },
      { art: "🍓", text: "딸기" },
      { art: "🍉", text: "수박" },
      { art: "🥕", text: "당근" },
      { art: "🥒", text: "오이" },
      { art: "🥔", text: "감자" },
      { art: "😋", text: "다 맛있어!" },
    ],
  },
  {
    id: "fruit-2",
    title: "페파의 장바구니",
    cast: ["peppa", "rabbit"],
    pages: [
      { art: "🐷", text: "페파가 장을 봐요." },
      { art: "🐰", text: "토끼도 같이 가요." },
      { art: "🍎", text: "사과 하나 쏙!" },
      { art: "🥕", text: "당근 하나 쏙!" },
      { art: "🍇", text: "포도 한 송이 쏙!" },
      { art: "🧺", text: "장바구니가 꽉 찼어요!" },
    ],
  },
  {
    id: "food-1",
    title: "맛있는 밥상",
    cast: ["peppa", "george", "mummy", "daddy"],
    pages: [
      { art: "🍚", text: "밥" },
      { art: "🍞", text: "빵" },
      { art: "🥛", text: "우유" },
      { art: "🍜", text: "국수" },
      { art: "🥚", text: "달걀" },
      { art: "🍕", text: "피자" },
      { art: "🍪", text: "과자" },
      { art: "🍬", text: "사탕" },
      { art: "🙏", text: "잘 먹겠습니다!" },
    ],
  },
  {
    id: "food-2",
    title: "꼬르륵 배고파",
    cast: ["george"],
    pages: [
      { art: "🐷", text: "꼬르륵, 조지가 배고파요." },
      { art: "🍞", text: "빵 먹을까?" },
      { art: "🥛", text: "우유 마실까?" },
      { art: "🍜", text: "국수 먹을까?" },
      { art: "😆", text: "다 먹고 싶어!" },
    ],
  },
  {
    id: "animal-1",
    title: "동물 친구들",
    cast: ["peppa", "rabbit"],
    pages: [
      { art: "🐶", text: "강아지" },
      { art: "🐱", text: "고양이" },
      { art: "🐰", text: "토끼" },
      { art: "🐻", text: "곰" },
      { art: "🦁", text: "사자" },
      { art: "🦒", text: "기린" },
      { art: "🦆", text: "오리" },
      { art: "🐘", text: "코끼리" },
      { art: "🥰", text: "모두 친구야!" },
    ],
  },
  {
    id: "animal-2",
    title: "누구 소리일까?",
    cast: ["peppa", "george"],
    pages: [
      { art: "🐶", text: "멍멍! 강아지" },
      { art: "🐱", text: "야옹! 고양이" },
      { art: "🦆", text: "꽥꽥! 오리" },
      { art: "🦁", text: "어흥! 사자" },
      { art: "🎵", text: "다 같이 노래해요!" },
    ],
  },
  {
    // 페파가 인물도 순서대로 가족을 소개한다 — 엄마·아빠·할머니·할아버지는 낱말 그림이 곧 그 인물
    id: "family-1",
    title: "우리 가족",
    cast: ["peppa", "george", "mummy", "daddy", "granny", "grandpa"],
    pages: [
      { art: "🐷", text: "안녕, 나는 페파야!" },
      { art: "🐷", text: "내 동생 조지야." },
      { art: "👩", text: "엄마" },
      { art: "👨", text: "아빠" },
      { art: "👵", text: "할머니" },
      { art: "👴", text: "할아버지" },
      { art: "❤️", text: "우리 가족, 사랑해요!" },
    ],
  },
  {
    id: "family-2",
    title: "아침에 나가요",
    cast: ["peppa", "mummy", "daddy"],
    pages: [
      { art: "🧢", text: "모자를 써요." },
      { art: "🧦", text: "양말을 신어요." },
      { art: "👟", text: "신발을 신어요." },
      { art: "👋", text: "엄마, 아빠, 다녀오겠습니다!" },
    ],
  },
];

const BY_ID = new Map(BOOKS.map((b) => [b.id, b]));

export function bookOf(id: string): Book | undefined {
  return BY_ID.get(id);
}
