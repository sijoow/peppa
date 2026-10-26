/**
 * 등장인물 — 사용자가 준 인물도(refs/인물도.png)의 이름을 그대로 쓴다. 안내와 소개는 페파가 한다.
 *   주인공: 페파 · 조지 · 아빠 · 엄마
 *   조연:   할아버지 · 할머니 · 토끼(2026-10-26 그림 시안에서 나온 토끼 친구)
 * word 는 같은 이름의 낱말 — 그 낱말 그림을 이 인물로 그린다(낱말 "엄마" = 페파 엄마).
 * look 은 힉스필드 그림 프롬프트에 넣는 생김새(scripts/image-list.mts).
 * 그림은 지금 인물도에서 자른 카드("cast:<id>" → public/img/cast), 힉스필드 그림이 생기면 image-manifest 가 바꾼다.
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

export type CastId = "peppa" | "george" | "daddy" | "mummy" | "grandpa" | "granny" | "rabbit";

export interface CastMember {
  id: CastId;
  name: string;
  role: "주인공" | "조연";
  word?: string;
  look: string;
}

export const CAST: readonly CastMember[] = [
  { id: "peppa", name: "페파", role: "주인공", look: "Peppa Pig, a little pink pig girl in a red dress" },
  { id: "george", name: "조지", role: "주인공", look: "George Pig, Peppa's little brother, a small pink pig boy in a blue top" },
  { id: "daddy", name: "아빠", role: "주인공", word: "아빠", look: "Daddy Pig, a big pink pig with round black glasses and a stubbly chin, in a teal top" },
  { id: "mummy", name: "엄마", role: "주인공", word: "엄마", look: "Mummy Pig, a pink pig mother with long eyelashes, in an orange dress" },
  { id: "grandpa", name: "할아버지", role: "조연", word: "할아버지", look: "Grandpa Pig, an old pink pig with white whiskers and a navy captain's hat with an anchor, in a purple top" },
  { id: "granny", name: "할머니", role: "조연", word: "할머니", look: "Granny Pig, an old pink pig in a big white sun hat with a pink band and a pink dress" },
  { id: "rabbit", name: "토끼", role: "조연", word: "토끼", look: "a cream-white rabbit girl with long upright ears in a pink dress, Peppa's friend" },
];

/** 안내하고 소개하는 주인공 */
export const GUIDE = CAST[0];

const BY_ID = new Map(CAST.map((c) => [c.id, c]));

export function castOf(id: CastId): CastMember | undefined {
  return BY_ID.get(id);
}
