"use client";

import { useEffect, useState } from "react";
import { charTimes, litCount } from "@/lib/readAlong";
import { currentSpeaking, onSpeaking, type Speaking } from "@/lib/voice";

/**
 * 노래방 읽기 — 페파(성우)가 읽는 곳까지 글자 색이 바뀐다. 2026-10-26 사용자 요청("여기를 읽고 있다는 표시").
 * 화면의 글과 say() 로 읽는 말이 똑같을 때만 칠한다. 다 읽으면 원래 색으로.
 */

/** 이 글을 지금 읽고 있으면 색이 바뀐 글자 수, 아니면 null */
export function useReadAlong(text: string): number | null {
  const [lit, setLit] = useState<number | null>(null);
  useEffect(() => {
    let raf = 0;
    let owner: Speaking | null = null;
    let times: number[] = [];
    const tick = () => {
      const s = currentSpeaking();
      if (!s || s.text !== text) {
        setLit(null);
        return;
      }
      if (owner !== s) {
        owner = s;
        times = charTimes(text, s.segs, s.estimate);
      }
      setLit(litCount(times, s.elapsed()));
      raf = requestAnimationFrame(tick);
    };
    const restart = () => {
      cancelAnimationFrame(raf);
      tick();
    };
    const off = onSpeaking(restart);
    restart();
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, [text]);
  return lit;
}

/** 글자 하나하나 — from 은 이 조각이 전체 글에서 시작하는 자리(낱말마다 나눠 그릴 때) */
export function LitChars({ text, lit, from = 0 }: { text: string; lit: number | null; from?: number }) {
  if (lit === null) return <>{text}</>;
  return (
    <>
      {[...text].map((ch, i) => (
        <span key={i} className={`read-char ${from + i < lit ? "read-lit" : ""}`}>
          {ch}
        </span>
      ))}
    </>
  );
}

/** 읽는 곳까지 색이 바뀌는 글 */
export function ReadAlong({ text }: { text: string }) {
  return <LitChars text={text} lit={useReadAlong(text)} />;
}
