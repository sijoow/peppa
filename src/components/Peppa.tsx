"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";
import { GUIDE } from "@/curriculum/cast";
import { imageOf } from "@/lib/assets";

/** 높이가 낮은 화면(폰 가로)이면 페파를 줄인다 — components/ui 의 useCompact 와 같은 기준 */
function useSmall(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia("(max-height: 520px)");
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia("(max-height: 520px)").matches,
    () => false,
  );
}

/*
 * 페파 — 인물도의 주인공이자 안내 캐릭터. 인사하고, 읽어 주고, 소개한다.
 * 힉스필드 전신 그림(image-manifest "mascot" · "mascot:cheer" · "mascot:wow", 바탕 투명)이 있으면 그 그림,
 * 없으면 인물도에서 자른 카드("cast:peppa")를 동그랗게, 그것도 없으면 🐷.
 */
export function Peppa({
  size = 140,
  mood = "happy",
  className = "",
}: {
  size?: number;
  mood?: "happy" | "cheer" | "wow";
  className?: string;
}) {
  const px = useSmall() ? Math.round(size * 0.5) : size;
  const full = imageOf(mood === "happy" ? "mascot" : `mascot:${mood}`) ?? imageOf("mascot");
  if (full) {
    return <Image src={full} alt="" width={px} height={px} draggable={false} className={`pointer-events-none object-contain ${className}`} />;
  }
  const card = imageOf(`cast:${GUIDE.id}`);
  if (card) {
    return (
      <span
        aria-hidden
        className={`relative inline-block shrink-0 overflow-hidden rounded-full border-[6px] border-card bg-card shadow-[0_8px_0_var(--paper-deep)] ${className}`}
        style={{ width: px, height: px }}
      >
        <Image src={card} alt="" fill sizes={`${px * 2}px`} draggable={false} className="pointer-events-none object-cover object-top" />
      </span>
    );
  }
  return (
    <span aria-hidden className={`inline-grid place-items-center leading-none ${className}`} style={{ width: px, height: px, fontSize: px * 0.8 }}>
      🐷
    </span>
  );
}
