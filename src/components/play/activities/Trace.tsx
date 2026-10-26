"use client";

import { useEffect, useState } from "react";
import { boardWidth, TraceBoard, useBoardKey } from "@/components/TraceBoard";
import { SquishButton } from "@/components/ui";
import { speakOf } from "@/curriculum/items";
import { LINES } from "@/curriculum/lines";
import { sfx } from "@/lib/sfx";
import { useTimers } from "@/lib/useTimers";
import { pick, say, stopVoice } from "@/lib/voice";
import type { OnDone } from "../types";

/**
 * 따라쓰기 — 연한 글자 위를 손가락으로 따라 쓴다 (판은 components/TraceBoard).
 * mode="free" 면 '글자를 써보자' — 잠깐 보여 주고 숨긴 뒤 혼자 쓴다.
 */
export function Trace({ items, onDone, mode = "trace" }: { items: string[]; onDone: OnDone; mode?: "trace" | "free" }) {
  const [idx, setIdx] = useState(0);
  const [key, erase] = useBoardKey();
  const [done, setDone] = useState(false);
  const later = useTimers();
  const glyph = items[idx];
  const wide = [...glyph].length > 1;

  useEffect(() => {
    void say([mode === "free" ? LINES.freeWrite : LINES.trace, speakOf(items[0])]);
    return () => stopVoice();
  }, [items, mode]);

  const success = () => {
    setDone(true);
    sfx.cheer();
    void say(pick(LINES.praise));
    later(() => {
      if (idx + 1 >= items.length) {
        onDone({ correct: 0, total: 0 });
        return;
      }
      setIdx(idx + 1);
      setDone(false);
      void say(speakOf(items[idx + 1]));
    }, 1500);
  };

  return (
    <div className={`flex h-full items-center justify-center gap-8 px-6 pb-6 portrait:flex-col portrait:gap-5 portrait:px-4 ${wide ? "flex-col" : ""}`}>
      <TraceBoard
        key={`${idx}-${key}`}
        text={glyph}
        mode={mode}
        aspect={wide ? Math.min(4.5, [...glyph].length * 1.05) : 1}
        width={wide ? boardWidth(Math.min(4.5, [...glyph].length * 1.05), 92, 16) : "min(66vh, calc(60*var(--vw)))"}
        onSuccess={success}
      />
      <div className={`flex items-center gap-5 portrait:flex-row portrait:flex-wrap portrait:justify-center portrait:gap-3 ${wide ? "" : "flex-col"}`}>
        <span className="rounded-full bg-card px-6 py-2 text-3xl shadow-[0_5px_0_var(--paper-deep)]">{speakOf(glyph)}</span>
        <SquishButton
          tone="butter"
          className="whitespace-nowrap rounded-full px-7 py-4 text-3xl"
          disabled={done}
          onClick={() => {
            sfx.tick();
            erase();
          }}
        >
          지우기
        </SquishButton>
        <div className="flex gap-2">
          {items.map((it, i) => (
            <span key={`${it}-${i}`} className={`h-4 rounded-full ${i === idx ? "w-10 bg-peach-deep" : i < idx ? "w-4 bg-butter-deep" : "w-4 bg-paper-deep"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
