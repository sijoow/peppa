"use client";

import { useEffect, useState } from "react";
import type { OnDone } from "@/components/play/types";
import { LINES } from "@/curriculum/lines";
import { answerFeedback, useTurn } from "@/lib/answer";
import { useTimers } from "@/lib/useTimers";
import { pick, say, stopVoice } from "@/lib/voice";

export type PickState = "idle" | "right" | "wrong";

/**
 * 보기 고르기 놀이의 공통 진행 — 자유 모드 놀이들이 그림만 바꿔서 쓴다.
 * 누르면 그 보기의 이름(nameOf)을 먼저 읽고 딩동댕/땡(lib/answer). 맞으면 칭찬을 끝까지 듣고 잠깐 쉰 뒤 다음 문제.
 * 틀린 보기는 tried 에 남아 흐리게 보인다. 두 번 틀리면 정답에 힌트. 첫 시도에 맞힌 수가 점수.
 */
export function usePick<R extends { answer: string; choices: string[] }>(
  rounds: R[],
  {
    intro,
    prompt,
    onDone,
    onRight,
    onWrong,
    nameOf,
  }: {
    intro: string;
    prompt: (r: R) => string[];
    onDone: OnDone;
    /** 맞혔을 때 칭찬 앞에 할 말 */
    onRight?: (r: R) => string[];
    /** 틀렸을 때 "다시 해 볼까?" 앞에 할 말 */
    onWrong?: (r: R) => string[];
    /** 누른 보기의 이름 — 먼저 읽어 준다 */
    nameOf?: (choice: string) => string[];
  },
) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [state, setState] = useState<PickState>("idle");
  const [tried, setTried] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const later = useTimers();
  const turn = useTurn();
  const round = rounds[idx];

  useEffect(() => {
    void say([intro, ...prompt(rounds[0])]);
    return () => stopVoice();
    // 처음 한 번만 — prompt 는 매번 새로 만들어지는 함수라 빼 둔다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, intro]);

  const choose = (c: string) => {
    // 이미 틀린 보기는 다시 눌러도 그대로(흐리게 보인다)
    if (state === "right" || tried.includes(c)) return;
    setPicked(c);
    const alive = turn();
    const name = nameOf?.(c) ?? [];
    if (c === round.answer) {
      const next = tried.length === 0 ? score + 1 : score;
      setScore(next);
      setState("right");
      void answerFeedback({ name, right: true, then: [...(onRight?.(round) ?? []), pick(LINES.praise)], alive }).then((ok) => {
        if (!ok) return;
        later(() => {
          if (idx + 1 >= rounds.length) {
            onDone({ correct: next, total: rounds.length });
            return;
          }
          setIdx(idx + 1);
          setPicked(null);
          setState("idle");
          setTried([]);
          void say(prompt(rounds[idx + 1]));
        }, 600);
      });
      return;
    }
    setState("wrong");
    setTried((t) => (t.includes(c) ? t : [...t, c]));
    void answerFeedback({ name, right: false, then: [...(onWrong?.(round) ?? []), pick(LINES.retry), ...prompt(round)], alive });
    later(() => setState((s) => (s === "wrong" ? "idle" : s)), 600);
  };

  return { idx, round, picked, state, tried, hint: tried.length >= 2, choose };
}
