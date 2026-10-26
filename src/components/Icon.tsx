import Image from "next/image";
import { artOf, imageOf } from "@/lib/assets";

/**
 * 아이콘 — 페파피그풍 그림으로 그린다. 찾는 순서: 메뉴·놀이 아이콘("icon:<id>") → 같은 뜻의 그림(lib/assets artOf) → 이모지 그대로.
 * 크기는 둘레 글자 크기(em)를 따른다 — 이모지를 쓰던 자리에 그대로 바꿔 끼운다.
 */
export function Icon({ id, emoji, className = "" }: { id?: string; emoji: string; className?: string }) {
  const src = (id ? imageOf(`icon:${id}`) : null) ?? artOf(emoji);
  if (!src) {
    return (
      <span aria-hidden className={className}>
        {emoji}
      </span>
    );
  }
  return (
    <span aria-hidden className={`relative inline-block h-[1.2em] w-[1.2em] shrink-0 align-middle ${className}`}>
      <Image src={src} alt="" fill sizes="160px" draggable={false} className="pointer-events-none object-contain" />
    </span>
  );
}
