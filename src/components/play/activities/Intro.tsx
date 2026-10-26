"use client";

import { useEffect, useState } from "react";
import { Glyph, Picture } from "@/components/Art";
import { SquishButton, toneAt, toneStyle, UiIcon } from "@/components/ui";
import { emojiOf, isLetter, speakOf } from "@/curriculum/items";
import { imageOf } from "@/lib/assets";
import { LINES } from "@/curriculum/lines";
import { sfx } from "@/lib/sfx";
import { say, stopVoice } from "@/lib/voice";
import type { OnDone } from "../types";

/** 글자 친구 만나기 / 낱말 카드 — 한 장씩 크게 보여 주고 이름을 들려준다. 카드를 누르면 다시 */
export function Intro({ items, onDone }: { items: string[]; onDone: OnDone }) {
  const [idx, setIdx] = useState(0);
  const [taps, setTaps] = useState(0);
  const letters = isLetter(items[0]);

  useEffect(() => {
    void say([letters ? LINES.introJamo : LINES.introWord, speakOf(items[0])]);
    return () => stopVoice();
  }, [items, letters]);

  const item = items[idx];
  const tone = toneAt(idx + 1);

  const again = () => {
    setTaps((t) => t + 1);
    void say(speakOf(item));
  };

  const next = () => {
    sfx.pop();
    if (idx + 1 >= items.length) {
      onDone({ correct: 0, total: 0 });
      return;
    }
    setIdx(idx + 1);
    void say(speakOf(items[idx + 1]));
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 pb-6">
      <button key={`${idx}-${taps}`} type="button" onClick={again} className={taps ? "animate-wiggle" : "animate-pop-in"} aria-label={speakOf(item)}>
        <span
          className="squish flex flex-col items-center justify-center gap-3 rounded-[3.5rem] px-14 py-8"
          style={{ ...toneStyle(tone), minWidth: "min(52vh, calc(60*var(--vw)))", minHeight: "min(56vh, calc(60*var(--vw)))" }}
        >
          {letters ? (
            <>
              <Glyph char={item} className="text-ink" style={{ fontSize: "min(38vh, calc(36*var(--vw)))" }} />
              <span className="text-[min(7vh,calc(6*var(--vw)))] text-ink/70">{speakOf(item)}</span>
            </>
          ) : !emojiOf(item) && !imageOf(item) ? (
            // 그림이 없는 글자·낱말(가, 거, 감 …) — 글자만 크게
            <span className="font-letter font-bold text-ink" style={{ fontSize: [...item].length > 2 ? "min(16vh, calc(12*var(--vw)))" : "min(30vh, calc(26*var(--vw)))" }}>
              {item}
            </span>
          ) : (
            <>
              <Picture item={item} size="min(30vh, calc(30*var(--vw)))" />
              <span className="font-letter font-bold text-ink" style={{ fontSize: "min(11vh, calc(9*var(--vw)))" }}>
                {item}
              </span>
            </>
          )}
        </span>
      </button>

      <div className="flex items-center gap-6">
        <div className="flex gap-2">
          {items.map((it, i) => (
            <span key={it} className={`h-4 rounded-full transition-all ${i === idx ? "w-10 bg-peach-deep" : i < idx ? "w-4 bg-butter-deep" : "w-4 bg-paper-deep"}`} />
          ))}
        </div>
        <SquishButton tone="mint" className="grid h-24 w-24 place-items-center rounded-full text-5xl" onClick={next} aria-label="다음">
          <UiIcon name="next" />
        </SquishButton>
      </div>
    </div>
  );
}
