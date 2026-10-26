"use client";

import { useCallback, useEffect, useRef } from "react";
import { sfx } from "@/lib/sfx";
import { say } from "@/lib/voice";

/*
 * 보기를 눌렀을 때 — 먼저 누른 것의 이름("바나나")을 읽고, 맞으면 딩동댕 · 틀리면 땡, 그다음 칭찬이나 "다시 해 볼까?".
 * 2026-10-26 사용자 요청: 누른 게 무엇인지 알려 주고, 정답도 바로 넘기지 말고 끝까지 듣고 볼 시간을 준다.
 */

/** 이번 차례가 아직 살아 있는지 — 다른 보기를 누르거나 화면이 사라지면 앞 차례는 멈춘다 */
export function useTurn(): () => () => boolean {
  const seq = useRef(0);
  useEffect(() => {
    const s = seq;
    return () => {
      s.current++;
    };
  }, []);
  return useCallback(() => {
    const mine = ++seq.current;
    return () => mine === seq.current;
  }, []);
}

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** 이름 → 딩동댕/땡 → 뒷말. 끝까지 했으면 true(맞았을 때 다음 문제로 넘어가도 된다는 뜻) */
export async function answerFeedback({
  name,
  right,
  then,
  alive,
}: {
  name: readonly string[];
  right: boolean;
  then: readonly string[];
  alive: () => boolean;
}): Promise<boolean> {
  if (name.length) {
    await say(name);
    if (!alive()) return false;
  }
  if (right) sfx.dingdong();
  else sfx.ddaeng();
  await wait(right ? 700 : 450);
  if (!alive()) return false;
  if (then.length) await say(then);
  return alive();
}
