/**
 * 첫 화면 아래 메뉴 — 이름은 아이가 바로 알아듣는 말로(2026-10-26 사용자: 토도 이름을 따를 필요 없이 우리 식으로).
 * 메뉴 화면 제목(ModeShell)도 이 이름을 쓴다. 그림은 힉스필드 "icon:menu:<id>"(페파 가족이 그 놀이를 하는 모습).
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

export type MenuId = "free" | "missions" | "galaxy" | "reading" | "studio";

export interface Menu {
  id: MenuId;
  href: string;
  title: string;
  /** 그림이 없을 때 대신 보일 이모지 */
  icon: string;
  tone: "sky" | "butter" | "lilac" | "rose" | "mint";
}

export const MENUS: Menu[] = [
  { id: "free", href: "/free", title: "놀이터", icon: "🎮", tone: "sky" },
  { id: "missions", href: "/missions", title: "도전", icon: "🏅", tone: "butter" },
  { id: "galaxy", href: "/galaxy", title: "우주 여행", icon: "🚀", tone: "lilac" },
  { id: "reading", href: "/reading", title: "책 읽기", icon: "🎤", tone: "rose" },
  { id: "studio", href: "/studio", title: "그리기", icon: "🎨", tone: "mint" },
];

export function menuOf(id: MenuId): Menu {
  return MENUS.find((m) => m.id === id) ?? MENUS[0];
}
