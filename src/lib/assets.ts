/**
 * 그림 찾기 — 힉스필드로 만든 그림이 있으면 그 파일, 없으면 null(화면은 임시 이모지를 그린다).
 * 목록은 content/image-manifest.json:
 *   낱말 그림   "사과"            → "img/words/1f34e.webp"
 *   책 한 쪽    "book:fruit-2:1"  → "img/books/fruit-2-1.webp"
 *   캐릭터      "mascot"          → "img/peppa/happy.webp"
 *   (값 끝의 "?v=…" 는 내용 해시 — 그림을 바꿔 올리면 주소가 바뀌어 캐시된 예전 그림이 안 나온다)
 * 그림 파일은 회사 Cafe24 호스팅에 올려 두고(npm run image:upload) 화면에는 그 주소를 바로 쓴다.
 * 캔버스에 그리는 그림(색칠·스티커·카드)만 같은 사이트 주소 "/cdn/…" 으로 — next.config rewrites 가 Cafe24 로 이어 준다.
 *   (다른 사이트 그림을 캔버스에 그리면 저장할 때 막힌다)
 * Cafe24 주소가 없으면(IMG_BASE 빈 값) public/ 의 사본을 쓴다.
 */

import manifest from "@/content/image-manifest.json";
import { WORDS } from "@/curriculum/words";

const FILES = manifest as Record<string, string>;
const BASE = process.env.IMG_BASE ?? "";

function urlOf(key: string, canvas: boolean): string | null {
  const f = FILES[key];
  if (!f) return null;
  if (!BASE) return `/${f}`;
  const path = f.replace(/^img\//, "");
  return canvas ? `/cdn/${path}` : BASE + path;
}

export function imageOf(key: string): string | null {
  return urlOf(key, false);
}

/** 캔버스로 그릴 그림 — 같은 사이트 주소라야 그린 그림을 저장할 수 있다 */
export function canvasImageOf(key: string): string | null {
  return urlOf(key, true);
}

// 이모지 글자 모양 선택자(U+FE0F)는 있어도 없어도 같은 그림
const bare = (emoji: string) => emoji.replace(/️/g, "");

/** 화면에 쓰던 이모지 → 같은 뜻의 페파풍 그림. 낱말 그림(🍎 → 사과)이 먼저, 그다음 이 표 */
const UI_ART: Record<string, string> = {
  "🔒": "icon:ui:lock",
  "❤": "icon:ui:heart",
  "🎉": "icon:ui:party",
  "✨": "icon:ui:sparkle",
  "🌈": "icon:ui:rainbow",
  "💎": "icon:ui:gem",
  "🎵": "icon:ui:music",
  "🧽": "icon:ui:eraser",
  "↩": "icon:ui:undo",
  "🗑": "icon:ui:trash",
  "💾": "icon:ui:save",
  "👋": "mascot",
  "🔍": "icon:free:find-me",
  "⛏": "icon:free:letter-mine",
  "📖": "icon:free:read-answer",
  "🔊": "icon:free:listen-pick",
  "🔗": "icon:free:assemble",
  "🖼": "icon:free:word-card",
  "📗": "icon:reading:books",
  "🎤": "icon:reading:coach",
  "📼": "icon:reading:record",
  "🏅": "icon:mission:badge",
  "🎯": "icon:mission:target",
  "🧭": "icon:menu:diagnose",
  "🚀": "icon:galaxy:type-2",
  "⏱": "시계",
  "🌷": "꽃",
  "🎂": "케이크",
};
const WORD_BY_EMOJI = new Map(WORDS.map((w) => [bare(w.emoji), w.text]));

/** 이모지 자리에 넣을 그림 주소 — 없으면 null(이모지 그대로). canvas 면 캔버스용 주소 */
export function artOf(emoji: string, canvas = false): string | null {
  const e = bare(emoji);
  const key = WORD_BY_EMOJI.get(e) ?? UI_ART[e];
  return key ? urlOf(key, canvas) : null;
}
