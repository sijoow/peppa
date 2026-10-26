/*
 * 색칠하기 그림 — 선으로 닫힌 칸을 누르면 칠해진다.
 * 주인공은 페파 가족: 힉스필드 선 그림(흰 바탕 검은 선 PNG, image-manifest "color:<인물 id>")이 생기면 맨 앞에 나온다.
 * 기본 선 그림(SVG)은 그 뒤에.
 */

import { CAST } from "@/curriculum/cast";
import { canvasImageOf } from "@/lib/assets";
import type { ColorSource } from "./ColorPad";

export interface ColoringPage {
  id: string;
  title: string;
  source: ColorSource;
}

const svg = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" fill="none" stroke="#3e3a52" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">${body}</svg>`;

const petals = Array.from({ length: 6 }, (_, i) => `<ellipse cx="200" cy="62" rx="26" ry="34" transform="rotate(${i * 60} 200 108)"/>`).join("");

const LINE_PAGES: { id: string; title: string; svg: string }[] = [
  {
    id: "apple",
    title: "사과",
    svg: svg(
      `<path d="M200 96 C170 72 110 76 102 140 C94 200 140 268 178 268 C190 268 194 262 200 262 C206 262 210 268 222 268 C260 268 306 200 298 140 C290 76 230 72 200 96 Z"/>
       <path d="M200 96 C198 76 204 56 216 42"/>
       <path d="M208 74 C224 46 266 42 280 58 C262 82 230 86 208 74 Z"/>
       <path d="M140 146 C136 166 140 186 152 204"/>`,
    ),
  },
  {
    id: "fish",
    title: "물고기",
    svg: svg(
      `<path d="M76 150 C116 78 240 78 292 150 C240 222 116 222 76 150 Z"/>
       <path d="M292 150 L352 98 L340 150 L352 202 Z"/>
       <path d="M196 98 C212 64 250 66 262 104 Z"/>
       <circle cx="128" cy="138" r="13"/>
       <path d="M176 106 C198 128 198 172 176 194"/>
       <path d="M214 120 C226 138 226 162 214 180"/>
       <circle cx="60" cy="86" r="11"/>
       <circle cx="44" cy="54" r="7"/>`,
    ),
  },
  {
    id: "house",
    title: "집",
    svg: svg(
      `<path d="M78 142 L200 52 L322 142 Z"/>
       <rect x="98" y="142" width="204" height="128"/>
       <rect x="178" y="192" width="46" height="78"/>
       <rect x="118" y="164" width="46" height="40"/>
       <path d="M141 164 L141 204 M118 184 L164 184"/>
       <rect x="238" y="164" width="46" height="40"/>
       <path d="M261 164 L261 204 M238 184 L284 184"/>
       <circle cx="342" cy="58" r="28"/>
       <path d="M26 270 L374 270"/>`,
    ),
  },
  {
    id: "flower",
    title: "꽃",
    svg: svg(
      `${petals}
       <circle cx="200" cy="108" r="30"/>
       <path d="M200 140 C196 190 204 232 200 284"/>
       <path d="M200 226 C170 204 138 208 126 226 C150 244 182 242 200 226 Z"/>
       <path d="M200 206 C230 184 262 188 274 206 C250 224 218 222 200 206 Z"/>`,
    ),
  },
  {
    id: "car",
    title: "자동차",
    svg: svg(
      `<path d="M56 204 L76 152 Q86 132 118 132 L168 132 L198 96 Q208 86 224 86 L286 86 Q302 86 310 100 L332 136 Q354 142 356 162 L356 204 Z"/>
       <path d="M206 132 L230 102 L280 102 L300 132 Z"/>
       <path d="M180 140 L180 200"/>
       <circle cx="120" cy="208" r="30"/>
       <circle cx="292" cy="208" r="30"/>
       <circle cx="120" cy="208" r="11"/>
       <circle cx="292" cy="208" r="11"/>
       <path d="M24 240 L376 240"/>`,
    ),
  },
];

/** 색칠 그림 목록 — 페파 가족 선 그림이 먼저(인물도 순서), 그다음 기본 선 그림 */
export const COLORING_PAGES: ColoringPage[] = [
  ...CAST.flatMap((c): ColoringPage[] => {
    const src = canvasImageOf(`color:${c.id}`);
    return src ? [{ id: c.id, title: c.name, source: { kind: "image", src } }] : [];
  }),
  ...LINE_PAGES.map((p): ColoringPage => ({ id: p.id, title: p.title, source: { kind: "svg", svg: p.svg } })),
];

/** 카드 쓰기 틀 */
export const CARD_TEMPLATES: { id: string; message: string; emoji: string; tone: string }[] = [
  { id: "love", message: "사랑해요", emoji: "❤️", tone: "#ffe3ec" },
  { id: "thanks", message: "고마워요", emoji: "🌷", tone: "#e3f7ee" },
  { id: "birthday", message: "생일 축하해요", emoji: "🎂", tone: "#fff3cf" },
];

/** 스티커 — 페파풍 낱말·아이콘 그림으로 찍힌다(🐷 페파, 👩 엄마, 👨 아빠, 🐰 토끼 …) */
export const STICKERS = ["🐷", "👩", "👨", "🐰", "⭐", "❤️", "🌈", "🌸", "🎈", "🦋", "🍓", "☀️"];

/** 문장 쓰기 연습 — 아이가 말로 자주 쓰는 짧은 문장 */
export const PRACTICE_SENTENCES = ["사랑해요", "고마워요", "안녕하세요", "엄마 사랑해", "아빠 최고"];
