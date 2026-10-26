"use client";

import { useEffect, useState, type PointerEvent } from "react";
import { Glyph, Picture } from "@/components/Art";
import { toneAt, toneStyle } from "@/components/ui";
import { isLetter, speakOf } from "@/curriculum/items";
import { LINES } from "@/curriculum/lines";
import { sfx } from "@/lib/sfx";
import { useTimers } from "@/lib/useTimers";
import { pick, say, stopVoice } from "@/lib/voice";
import type { OnDone } from "../types";

/*
 * 쏙쏙 넣기 — 아래 카드를 꾹 눌러 끌어다 위 자리에 넣는다. 끌기 익히기 + 모양 맞추기.
 *   글자: 같은 모양의 그림자에   낱말: 맞는 그림에
 * 점수는 카드마다 첫 번째로 놓은 곳이 맞았는지. 빈 곳에 놓으면 그냥 제자리로(틀린 것 아님).
 */

interface Drag {
  item: string;
  pointer: number;
  x0: number;
  y0: number;
  dx: number;
  dy: number;
}

export function DragMatch({ screens, assess, onDone }: { screens: { targets: string[]; tokens: string[] }[]; assess: boolean; onDone: OnDone }) {
  const [si, setSi] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [shaking, setShaking] = useState<string | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [misses, setMisses] = useState<Record<string, number>>({});
  const later = useTimers();

  const screen = screens[si];
  const letters = isLetter(screen.targets[0]);
  const total = screens.reduce((n, s) => n + s.targets.length, 0);
  const box = letters ? "min(24vh, calc(17*var(--vw)))" : "min(27vh, calc(19*var(--vw)))";

  useEffect(() => {
    void say(letters ? LINES.dragJamo : LINES.dragWord);
    return () => stopVoice();
  }, [letters]);

  const nextScreen = () => {
    if (si + 1 >= screens.length) {
      onDone({ correct: total - failed.length, total });
      return;
    }
    setSi(si + 1);
    setPlaced([]);
    setMisses({});
  };

  const down = (item: string) => (e: PointerEvent<HTMLButtonElement>) => {
    if (placed.includes(item) || drag) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    sfx.tick();
    setDrag({ item, pointer: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 });
  };

  const move = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    setDrag({ ...drag, dx: e.clientX - drag.x0, dy: e.clientY - drag.y0 });
  };

  const up = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const item = drag.item;
    setDrag(null);
    const hit = document
      .elementsFromPoint(e.clientX, e.clientY)
      .map((el) => el.closest<HTMLElement>("[data-drop]"))
      .find((el) => el)?.dataset.drop;
    if (!hit || placed.includes(hit)) return;
    if (hit === item) {
      sfx.ding();
      void say(speakOf(item));
      const next = [...placed, item];
      setPlaced(next);
      if (next.length === screen.targets.length) later(nextScreen, 1200);
      return;
    }
    sfx.boop();
    setShaking(item);
    later(() => setShaking(null), 500);
    if (!failed.includes(item)) setFailed([...failed, item]);
    setMisses({ ...misses, [item]: (misses[item] ?? 0) + 1 });
    if (!assess) void say(pick(LINES.retry));
  };

  const hintFor = drag && !assess && (misses[drag.item] ?? 0) >= 2 ? drag.item : null;

  return (
    <div className="flex h-full touch-none flex-col items-center justify-evenly px-6 pb-4" onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
      {/* 넣을 자리 */}
      <div key={`t${si}`} className="flex flex-wrap justify-center gap-8">
        {screen.targets.map((t) => {
          const filled = placed.includes(t);
          return (
            <div
              key={t}
              data-drop={t}
              className={`relative grid place-items-center rounded-[2.5rem] border-[6px] transition-colors ${
                filled ? "animate-pop-in border-mint-deep bg-mint" : "border-dashed border-ink/15 bg-card/70"
              } ${hintFor === t ? "animate-breathe border-butter-deep" : ""}`}
              style={{ width: box, height: box }}
            >
              {letters ? (
                <Glyph char={t} className={filled ? "text-ink" : "text-ink/15"} style={{ fontSize: `calc(${box} * 0.7)` }} />
              ) : (
                <>
                  <Picture item={t} size={`calc(${box} * 0.72)`} />
                  {filled && <span className="absolute -bottom-5 rounded-full bg-card px-4 py-1 font-letter text-3xl font-bold shadow">{t}</span>}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* 끌어 갈 카드 */}
      <div key={`k${si}`} className="flex flex-wrap justify-center gap-8">
        {screen.tokens.map((t, i) => {
          if (placed.includes(t)) return <div key={t} style={{ width: letters ? box : "min(30vh, calc(22*var(--vw)))", height: letters ? box : "min(14vh, calc(11*var(--vw)))" }} />;
          const dragging = drag?.item === t;
          return (
            <button
              key={t}
              type="button"
              aria-label={speakOf(t)}
              onPointerDown={down(t)}
              className={`squish relative grid touch-none place-items-center rounded-[2.2rem] ${shaking === t ? "animate-shake" : ""}`}
              style={{
                ...toneStyle(toneAt(i + si * 3)),
                width: letters ? box : "min(30vh, calc(22*var(--vw)))",
                height: letters ? box : "min(14vh, calc(11*var(--vw)))",
                transform: dragging ? `translate(${drag.dx}px, ${drag.dy}px) scale(1.08)` : undefined,
                transition: dragging ? "none" : undefined,
                zIndex: dragging ? 50 : undefined,
              }}
            >
              {letters ? (
                <Glyph char={t} style={{ fontSize: `calc(${box} * 0.62)` }} />
              ) : (
                <span className="font-letter font-bold" style={{ fontSize: "min(8vh, calc(6*var(--vw)))" }}>
                  {t}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
