"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Peppa } from "@/components/Peppa";
import type { OnDone } from "@/components/play/types";
import { SquishButton, toneAt } from "@/components/ui";
import { LINES } from "@/curriculum/lines";
import { sfx } from "@/lib/sfx";
import { useTimers } from "@/lib/useTimers";
import { say, stopVoice } from "@/lib/voice";

/*
 * 리듬 한글 — 글자 방울이 박자에 맞춰 오른쪽에서 날아온다. 동그라미에 닿을 때 페파가 그 글자를 읽어 주고,
 * 그때 맞춰 누르면 별! (가 나 다 라 … 노래처럼 받침 없는 글자를 소리 내 읽는 연습)
 */

const BEAT = 1000;
const LEAD = 2 * BEAT; // 방울이 나타나서 동그라미까지 오는 시간
const WINDOW = 280; // 이 안에 누르면 맞힌 것
const HIT_X = 16; // 동그라미 자리(%)

export function RhythmGame({ notes, onDone }: { notes: string[]; onDone: OnDone }) {
  const [phase, setPhase] = useState<"ready" | "play">("ready");
  const [now, setNow] = useState(0);
  const [hit, setHit] = useState<boolean[]>(() => notes.map(() => false));
  const [flash, setFlash] = useState(0);
  const start = useRef(0);
  const later = useTimers();
  const at = (i: number) => LEAD + i * BEAT;

  useEffect(() => {
    void say(LINES.rhythm);
    return () => stopVoice();
  }, []);

  useEffect(() => {
    if (phase !== "play") return;
    let id = 0;
    const tick = () => {
      setNow(performance.now() - start.current);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [phase]);

  const play = () => {
    sfx.wake();
    stopVoice();
    start.current = performance.now();
    setHit(notes.map(() => false));
    setPhase("play");
    for (let b = 0; b <= notes.length + 1; b++) later(() => sfx.tick(), b * BEAT);
    notes.forEach((n, i) => later(() => void say(n), at(i)));
    const end = at(notes.length - 1) + BEAT * 1.2;
    later(() => {
      setPhase("ready");
      setHit((h) => {
        const correct = h.filter(Boolean).length;
        onDone({ correct, total: notes.length });
        return h;
      });
    }, end);
  };

  const tap = () => {
    if (phase !== "play") return;
    const t = performance.now() - start.current;
    const i = notes.findIndex((_, k) => !hit[k] && Math.abs(t - at(k)) <= WINDOW);
    if (i < 0) {
      sfx.boop();
      return;
    }
    sfx.ding();
    setHit(hit.map((h, k) => (k === i ? true : h)));
    setFlash((f) => f + 1);
  };

  const stars = hit.filter(Boolean).length;

  return (
    <div className="flex h-full flex-col items-center justify-evenly px-6 pb-6">
      <div className="text-4xl"><Icon emoji="⭐" /> {stars} / {notes.length}</div>
      <div className="relative h-[34%] w-full max-w-6xl overflow-hidden rounded-[3rem] bg-card/80 shadow-[inset_0_8px_16px_rgb(0_0_0/0.06)]">
        <div className="absolute inset-y-0 my-auto h-3 w-full bg-paper-deep" style={{ top: 0, bottom: 0 }} />
        <div
          key={flash}
          className="absolute top-1/2 grid h-[min(24vh,calc(16*var(--vw)))] w-[min(24vh,calc(16*var(--vw)))] -translate-x-1/2 -translate-y-1/2 animate-pop-in place-items-center rounded-full border-[8px] border-dashed border-peach-deep"
          style={{ left: `${HIT_X}%` }}
        />
        {phase === "play" &&
          notes.map((n, i) => {
            const x = HIT_X + ((at(i) - now) / LEAD) * (100 - HIT_X);
            if (x < -10 || x > 110) return null;
            return (
              <span
                key={i}
                className={`absolute top-1/2 grid h-[min(19vh,calc(13*var(--vw)))] w-[min(19vh,calc(13*var(--vw)))] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-letter text-[min(10vh,calc(7*var(--vw)))] font-bold ${
                  hit[i] ? "animate-burst" : ""
                }`}
                style={{ left: `${x}%`, background: hit[i] ? "var(--mint)" : `var(--${toneAt(i)})` }}
              >
                {n}
              </span>
            );
          })}
        {phase === "ready" && (
          <div className="absolute inset-0 flex items-center justify-center gap-4">
            <Peppa size={120} className="animate-float" />
            <span className="font-letter text-[min(7vh,calc(5*var(--vw)))] font-bold text-ink/70">{notes.join(" ")}</span>
          </div>
        )}
      </div>
      {phase === "ready" ? (
        <SquishButton tone="peach" className="rounded-full px-14 py-5 text-5xl" onClick={play}>
          <Icon emoji="🎵" /> 시작!
        </SquishButton>
      ) : (
        <SquishButton tone="rose" className="grid h-40 w-40 place-items-center rounded-full text-7xl" onClick={tap} aria-label="톡">
          <Icon emoji="🥁" />
        </SquishButton>
      )}
    </div>
  );
}
