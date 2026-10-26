/**
 * 힉스필드로 만들 그림 목록 — 지금 이모지·임시 그림으로 대신하고 있는 자리들.
 *   npm run image:list   → scripts/image-list.json
 * 그림체는 페파피그(refs/ 레퍼런스), 등장인물은 curriculum/cast(인물도 이름 그대로, 페파가 안내).
 * 키는 src/content/image-manifest.json 에 그대로 쓰인다(lib/assets):
 *   낱말 "사과" · 책 한 쪽 "book:fruit-2:1" · 안내 페파 "mascot" · 아이콘 "icon:free:trace" · 색칠 "color:peppa"
 * 인물 카드 "cast:<id>" 는 인물도에서 잘라 쓰고 있어서 여기 넣지 않는다.
 */

import { writeFileSync } from "node:fs";
import { BOOKS } from "../src/curriculum/books.ts";
import { CAST, castOf } from "../src/curriculum/cast.ts";
import { isLetter } from "../src/curriculum/items.ts";
import { FREE_GAMES, GALAXIES, STUDIO } from "../src/curriculum/modes.ts";
import { WORDS } from "../src/curriculum/words.ts";

type Entry = { key: string; now: string; what: string; who?: string };

const characters: Entry[] = [
  { key: "mascot", now: "인물도 카드", what: "안내 페파 — 전신, 손 흔들며 인사 (바탕 투명)" },
  { key: "mascot:cheer", now: "인물도 카드", what: "안내 페파 — 두 팔 들고 신난 모습 (바탕 투명)" },
  { key: "mascot:wow", now: "인물도 카드", what: "안내 페파 — 깜짝 놀란 모습 (바탕 투명)" },
  { key: "app-icon", now: "icon.svg", what: "앱 아이콘 — 페파 얼굴 (512×512)" },
  { key: "bg:home", now: "CSS 구름", what: "첫 화면 바탕 — 언덕 위 페파네 집과 하늘 (시안 gpt-3-home-bg)" },
];

// 낱말 이름이 인물과 같으면(엄마·아빠·할머니·할아버지·토끼) 그 인물로 그린다
const castByWord = new Map(CAST.flatMap((c) => (c.word ? [[c.word, c] as const] : [])));
const words: Entry[] = WORDS.map((w) => {
  const c = castByWord.get(w.text);
  return { key: w.text, now: w.emoji, what: `낱말 그림: ${w.text}`, ...(c && { who: `${c.name}(${c.role}) — ${c.look}` }) };
});

// 책 쪽 그림 — 글자 그림책(ㄱ ㄴ …) 쪽은 글자를 그대로 쓰고, 낱말이 그대로 나오는 쪽("사과 하나 쏙!")은 낱말 그림을 다시 쓴다
const wordByEmoji = new Map(WORDS.map((w) => [w.emoji, w.text]));
const bookScenes: Entry[] = BOOKS.flatMap((b) => {
  const who = (b.cast ?? []).map((id) => castOf(id)?.name).join("·");
  return b.pages.flatMap((p, i) => {
    const word = wordByEmoji.get(p.art);
    if (isLetter(p.art) || (word && p.text.includes(word))) return [];
    return [{ key: `book:${b.id}:${i}`, now: p.art, what: `책 「${b.title}」 ${i + 1}쪽: ${p.text}`, ...(who && { who }) }];
  });
});

// 메뉴·놀이 아이콘 — components/Icon 이 "icon:<id>" 로 찾는다(HomeScreen·ModeShell·각 목록)
// 2026-10-26 사용자 선택 = 혼합: 첫 화면 큰 메뉴 6개는 페파 가족이 그 놀이를 하는 모습, 나머지는 페파피그 그림체 사물.
// 모두 바탕 투명 1:1 (GPT Image 2.5 · 1k · medium = 장당 0.5크레딧). 메뉴 인물은 초안 — 뽑을 때 같이 정한다.
const MENU = [
  ["free", "🎮", "자유 모드", "페파 — 진흙 웅덩이에서 폴짝 뛰기"],
  ["missions", "🏅", "미션", "조지 — 금메달을 목에 걸고 뿌듯"],
  ["galaxy", "🚀", "은하계 여행", "조지 — 우주 헬멧 쓰고 작은 로켓 타기"],
  ["reading", "🎤", "읽기 연습", "페파 — 그림책을 펼쳐 소리 내어 읽기"],
  ["studio", "🎨", "작업실", "엄마 — 붓과 팔레트로 그림 그리기"],
  ["diagnose", "🧭", "단원 찾기 퀴즈", "아빠 — 돋보기 들고 찾기"],
] as const;
const icons: Entry[] = [
  ...MENU.map(([id, now, title, who]) => ({ key: `icon:menu:${id}`, now, what: `메뉴 아이콘(인물): ${title}`, who })),
  ...FREE_GAMES.map((g) => ({ key: `icon:free:${g.id}`, now: g.icon, what: `자유 모드 놀이: ${g.title}` })),
  ...STUDIO.map((s) => ({ key: `icon:studio:${s.id}`, now: s.icon, what: `작업실: ${s.title}` })),
  ...GALAXIES.map((g) => ({ key: `icon:galaxy:${g.id}`, now: g.icon, what: `은하계: ${g.title}` })),
  { key: "icon:reading:coach", now: "🎤", what: "읽기 연습: 페파의 읽기 코칭" },
  { key: "icon:reading:record", now: "📼", what: "읽기 연습: 또박또박 책 녹음" },
  { key: "icon:reading:books", now: "📚", what: "읽기 연습: 책 고르기" },
  { key: "icon:mission:badge", now: "🏅", what: "미션 배지" },
  { key: "icon:mission:target", now: "🎯", what: "미션 도전" },
  { key: "icon:firefly", now: "반딧불이(SVG)", what: "모으는 반딧불이 — 보상" },
];

// 작업실 색칠하기 — 페파 가족 선 그림(흰 바탕에 검은 선, 칸이 닫히게)
const coloring: Entry[] = CAST.map((c) => ({ key: `color:${c.id}`, now: "없음", what: `색칠하기 선 그림: ${c.name}(${c.role})`, who: c.look }));

// 화면 바탕 — 메뉴마다 페파 동화마을의 한 장소(ModeShell scene). 가운데는 비워 둔다
const scenes: Entry[] = [
  { key: "bg:play", now: "종이 바탕", what: "오늘의 모험·단원 찾기 — 페파네 정원" },
  { key: "bg:free", now: "종이 바탕", what: "자유 모드 — 놀이터" },
  { key: "bg:missions", now: "종이 바탕", what: "미션 — 놀이학교" },
  { key: "bg:galaxy", now: "CSS 밤하늘", what: "은하계 여행 — 밤하늘" },
  { key: "bg:reading", now: "종이 바탕", what: "읽기 연습 — 책방" },
  { key: "bg:studio", now: "종이 바탕", what: "작업실 — 그림 그리는 구석" },
];

// 화면 곳곳의 작은 그림 — 낱말 그림으로 대신할 수 없는 이모지만(components/Icon 의 대응표)
const ui: Entry[] = [
  { key: "icon:ui:lock", now: "🔒", what: "잠금" },
  { key: "icon:ui:heart", now: "❤️", what: "하트(목숨·사랑 카드·스티커)" },
  { key: "icon:ui:party", now: "🎉", what: "축하" },
  { key: "icon:ui:sparkle", now: "✨", what: "반짝" },
  { key: "icon:ui:rainbow", now: "🌈", what: "무지개 스티커" },
  { key: "icon:ui:gem", now: "💎", what: "글자 광산 보석" },
  { key: "icon:ui:music", now: "🎵", what: "리듬 음표" },
  { key: "icon:ui:eraser", now: "🧽", what: "지우개" },
  { key: "icon:ui:undo", now: "↩️", what: "되돌리기" },
  { key: "icon:ui:trash", now: "🗑️", what: "모두 지우기" },
  { key: "icon:ui:save", now: "💾", what: "저장(액자)" },
  // 그리는 도구 — 손끝에 따라다니는 펜 그림(끝이 왼쪽 아래). components/studio/PenCursor
  { key: "icon:tool:pencil", now: "✏️", what: "연필(글자 쓰기)" },
  { key: "icon:tool:crayon", now: "🖍️", what: "크레파스(그리기)" },
  { key: "icon:tool:brush", now: "🖌️", what: "붓펜(색칠)" },
  { key: "icon:tool:glitter", now: "✨", what: "반짝이 펜" },
  { key: "icon:tool:rainbow", now: "🌈", what: "무지개 펜" },
  { key: "icon:tool:bucket", now: "🪣", what: "채우기(물감통)" },
];

// 놀이터 큰 카드 — 페파 가족이 그 놀이를 하는 장면(2026-10-26 사용자: 놀이터를 예쁘게, 힉스필드로).
// 작은 아이콘 icon:free:* 는 다른 곳(⛏ 📖 🔍 대응)에서도 쓰여서 그대로 두고 장면은 따로 둔다.
const freeScenes: Entry[] = FREE_GAMES.map((g) => ({ key: `scene:free:${g.id}`, now: g.icon, what: `놀이터 카드 장면: ${g.title}` }));

const sections = { characters, words, bookScenes, icons, coloring, scenes, ui, freeScenes };
const total = Object.values(sections).reduce((n, s) => n + s.length, 0);
writeFileSync(new URL("./image-list.json", import.meta.url), JSON.stringify({ total, ...sections }, null, 2) + "\n");
console.log(
  `캐릭터·바탕 ${characters.length} · 낱말 ${words.length} · 책 장면 ${bookScenes.length} · 아이콘 ${icons.length} · 색칠 ${coloring.length} · 화면 바탕 ${scenes.length} · 작은 그림 ${ui.length} · 놀이터 장면 ${freeScenes.length} → 합계 ${total}장 → scripts/image-list.json`,
);
