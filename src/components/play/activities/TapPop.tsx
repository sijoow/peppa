"use client";

import { useEffect, useState } from "react";
import { toneAt, useCompact, usePortrait } from "@/components/ui";
import { isLetter, speakOf } from "@/curriculum/items";
import { LINES } from "@/curriculum/lines";
import type { Bubble } from "@/lib/rounds";
import { sfx } from "@/lib/sfx";
import { useTimers } from "@/lib/useTimers";
import { say, stopVoice } from "@/lib/voice";
import type { OnDone } from "../types";

/** 톡톡 방울 — 둥실 떠 있는 방울을 누르면 뽁 터지며 글자 이름(낱말)을 들려준다. 누르기 익히기 + 눈에 익히기 */
export function TapPop({ bubbles, onDone }: { bubbles: Bubble[]; onDone: OnDone }) {
  const [popped, setPopped] = useState<number[]>([]);
  const later = useTimers();
  const portrait = usePortrait();
  const k = useCompact() ? 0.55 : portrait ? 0.78 : 1;

  useEffect(() => {
    void say(LINES.tapPop);
    return () => stopVoice();
  }, []);

  const tap = (i: number) => {
    if (popped.includes(i)) return;
    sfx.pop();
    void say(speakOf(bubbles[i].item));
    const next = [...popped, i];
    setPopped(next);
    if (next.length === bubbles.length) later(() => onDone({ correct: 0, total: 0 }), 1500);
  };

  return (
    <div className="relative h-full w-full">
      {bubbles.map((b, i) => {
        const gone = popped.includes(i);
        const word = !isLetter(b.item);
        const size = Math.round((word ? 168 : 136) * b.scale * k);
        const tone = toneAt(b.hue);
        return (
          <button
            key={i}
            type="button"
            disabled={gone}
            aria-label={speakOf(b.item)}
            onClick={() => tap(i)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            // 가장자리에 걸리지 않게 — 중심을 반지름만큼 안쪽에 둔다(세로 폰에서 방울이 반쯤 잘리던 것)
            style={{ left: `clamp(${size / 2 + 6}px, ${b.x}%, calc(100% - ${size / 2 + 6}px))`, top: `clamp(${size / 2 + 6}px, ${b.y}%, calc(100% - ${size / 2 + 6}px))`, width: size, height: size }}
          >
            <span className={`block h-full w-full ${gone ? "animate-burst" : "animate-float"}`} style={{ animationDelay: gone ? "0s" : `${b.delay}s` }}>
              <span
                className="grid h-full w-full place-items-center rounded-full border-4 border-white/80 shadow-[inset_-10px_-14px_0_rgb(0_0_0/0.06),0_16px_26px_-12px_rgb(62_58_82/0.45)]"
                style={{ background: `radial-gradient(circle at 32% 26%, #fff 0 11%, var(--${tone}) 12% 100%)` }}
              >
                <span className={`font-letter font-bold leading-none text-ink ${word ? "text-4xl" : "text-7xl"}`}>{b.item}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
