"use client";

import { useEffect, useRef, useState } from "react";
import { Picture } from "@/components/Art";
import { Icon } from "@/components/Icon";
import { SquishButton, toneStyle } from "@/components/ui";
import { LINES } from "@/curriculum/lines";
import { sfx } from "@/lib/sfx";
import { useTimers } from "@/lib/useTimers";
import { pick, say, stopVoice } from "@/lib/voice";
import type { OnDone } from "../types";

/*
 * 말소리 짝짝 — 낱말을 듣고 소리 마디(음절)만큼 손뼉. 음운 인식(토도 1단원 학습 주제).
 * 마지막으로 친 뒤 잠깐 멈추면 센다. 틀리면 페파가 "사—과" 마디마다 짝짝 보여 준다.
 */

const WAIT = 1400;

export function Clap({ rounds, assess, onDone }: { rounds: { word: string; syllables: string[] }[]; assess: boolean; onDone: OnDone }) {
  const [idx, setIdx] = useState(0);
  const [taps, setTaps] = useState(0);
  const [state, setState] = useState<"ready" | "counting" | "right" | "demo">("ready");
  const [lit, setLit] = useState(-1);
  const [missed, setMissed] = useState(false);
  const [score, setScore] = useState(0);
  const seq = useRef(0);
  const later = useTimers();
  const round = rounds[idx];

  useEffect(() => {
    void say([LINES.clap, rounds[0].word, LINES.clapHowMany]);
    return () => stopVoice();
  }, [rounds]);

  const advance = (nextScore: number) => {
    if (idx + 1 >= rounds.length) {
      onDone({ correct: nextScore, total: rounds.length });
      return;
    }
    setIdx(idx + 1);
    setTaps(0);
    setMissed(false);
    setState("ready");
    void say([rounds[idx + 1].word, LINES.clapHowMany]);
  };

  /** 마디마다 불을 켜며 짝짝 — 보여 주고 나서 then */
  const show = (then: () => void) => {
    void say(round.word);
    round.syllables.forEach((_, i) =>
      later(() => {
        setLit(i);
        sfx.clap();
      }, 600 + i * 650),
    );
    later(() => {
      setLit(-1);
      then();
    }, 600 + round.syllables.length * 650 + 500);
  };

  const judge = (count: number) => {
    if (count === round.syllables.length) {
      const nextScore = missed ? score : score + 1;
      setScore(nextScore);
      setState("right");
      sfx.ding();
      void say(pick(LINES.praise));
      later(() => show(() => advance(nextScore)), 900);
      return;
    }
    sfx.boop();
    setState("demo");
    show(() => {
      if (assess) {
        advance(score);
        return;
      }
      setMissed(true);
      setTaps(0);
      setState("ready");
      void say([pick(LINES.retry), round.word]);
    });
  };

  const clap = () => {
    if (state === "right" || state === "demo") return;
    sfx.clap();
    const n = taps + 1;
    setTaps(n);
    setState("counting");
    const mine = ++seq.current;
    later(() => {
      if (mine === seq.current) judge(n);
    }, WAIT);
  };

  const reveal = state === "right" || state === "demo";

  return (
    <div className="flex h-full flex-col items-center justify-evenly gap-4 px-6 pb-6">
      <button key={idx} type="button" className="animate-pop-in" onClick={() => void say(round.word)} aria-label={round.word}>
        <span className="squish flex flex-col items-center rounded-[3rem] px-12 pb-5 pt-7" style={toneStyle("card")}>
          <Picture item={round.word} size="min(26vh, calc(22*var(--vw)))" />
          {/* 마디 칸은 답한 뒤에만 — 미리 보이면 귀가 아니라 눈으로 세게 된다 */}
          <span className="mt-2 flex gap-2" style={{ minHeight: "min(9vh, calc(6.5*var(--vw)))" }}>
            {reveal &&
              round.syllables.map((s, i) => (
                <span
                  key={i}
                  className={`grid animate-pop-in place-items-center rounded-2xl px-3 font-letter font-bold transition-all ${lit === i ? "scale-125 bg-butter" : "bg-paper"}`}
                  style={{ fontSize: "min(7vh, calc(5*var(--vw)))" }}
                >
                  {s}
                </span>
              ))}
          </span>
        </span>
      </button>

      <div className="flex min-h-16 items-center gap-2 text-5xl" aria-live="polite">
        {Array.from({ length: taps }, (_, i) => (
          <span key={i} className="animate-pop-in">
            <Icon emoji="👏" />
          </span>
        ))}
      </div>

      <SquishButton
        tone={state === "right" ? "mint" : "rose"}
        onClick={clap}
        className="grid h-40 w-40 place-items-center rounded-full text-7xl"
        aria-label="짝"
      >
        <Icon emoji="👏" />
      </SquishButton>
    </div>
  );
}
