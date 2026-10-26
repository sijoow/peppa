"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { emojiOf, isLetter } from "@/curriculum/items";
import { imageOf } from "@/lib/assets";

/** 배우는 글자 — 획이 반듯한 본고딕 */
export function Glyph({ char, className = "", style }: { char: string; className?: string; style?: CSSProperties }) {
  return (
    <span className={`font-letter font-bold leading-none ${className}`} style={style}>
      {char}
    </span>
  );
}

function Img({ src, alt, size }: { src: string; alt: string; size: string }) {
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <Image src={src} alt={alt} fill sizes="40vw" draggable={false} className="pointer-events-none object-contain" />
    </span>
  );
}

/** 낱말 그림 — 힉스필드 그림이 있으면 그것, 없으면 임시 이모지 */
export function Picture({ item, size, imageKey }: { item: string; size: string; imageKey?: string }) {
  const src = imageOf(imageKey ?? item);
  if (src) return <Img src={src} alt={item} size={size} />;
  return (
    <span role="img" aria-label={item} className="inline-grid place-items-center leading-none" style={{ width: size, height: size, fontSize: `calc(${size} * 0.78)` }}>
      {emojiOf(item) ?? "🎈"}
    </span>
  );
}

/** 책 한 쪽 그림 — 그림 파일 > 글자 > 이모지 */
export function PageArt({ art, imageKey, size, color }: { art: string; imageKey: string; size: string; color: string }) {
  const src = imageOf(imageKey);
  if (src) return <Img src={src} alt="" size={size} />;
  if (isLetter(art)) return <Glyph char={art} style={{ fontSize: `calc(${size} * 0.82)`, color }} />;
  return (
    <span aria-hidden className="inline-grid place-items-center leading-none" style={{ width: size, height: size, fontSize: `calc(${size} * 0.78)` }}>
      {art}
    </span>
  );
}
