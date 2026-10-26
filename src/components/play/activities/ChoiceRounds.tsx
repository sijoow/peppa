"use client";

import { useEffect, useState } from "react";
import { Glyph, Picture } from "@/components/Art";
import { SpeakerButton, SquishButton, toneStyle } from "@/components/ui";
import { isLetter, speakOf } from "@/curriculum/items";
import { LINES } from "@/curriculum/lines";
import { syllablesOf } from "@/curriculum/words";
import { answerFeedback, useTurn } from "@/lib/answer";
import type { Round } from "@/lib/rounds";
import { useTimers } from "@/lib/useTimers";
import { pick, say, stopVoice } from "@/lib/voice";
import type { OnDone } from "../types";

/*
 * 보기 고르기 활동 셋을 한 틀로:
 *   listen  듣고 글자 고르기 — "기역! 어디 있을까?" 듣고 카드 고르기
 *   same    똑같은 모양 찾기 — 위에 보이는 글자(낱말)와 같은 카드
 *   picture 낱말 보고 그림 찾기 — 통글자 낱말을 보고 맞는 그림
 * 누르면 그 카드의 이름("기역", "바나나")을 먼저 읽고 딩동댕/땡(lib/answer) — 맞으면 칭찬을 끝까지 듣고 잠깐 쉰 뒤 다음.
 * 평소: 틀린 카드는 흐려지고 다시. 두 번 틀리면 정답 카드가 숨 쉬듯 커졌다 작아진다(힌트).
 * 형성 평가 날: 틀리면 정답을 보여 주고 다음으로 — 첫 시도만 점수.
 */

export type ChoiceVariant = "listen" | "same" | "picture" | "sound-first" | "sound-last" | "blend";
type CardState = "idle" | "right" | "wrong" | "reveal";

function promptOf(variant: ChoiceVariant, r: Round): string[] {
  if (variant === "listen") return [speakOf(r.target), LINES.whereIs];
  if (variant === "same") return [speakOf(r.target)];
  if (variant === "sound-first") return [r.word ?? "", LINES.sameFirstQ];
  if (variant === "sound-last") return [r.word ?? "", LINES.sameLastQ];
  if (variant === "blend") return [...syllablesOf(r.target), LINES.blendQ];
  return [];
}

const INTRO: Record<ChoiceVariant, string> = {
  listen: LINES.listenChoose,
  same: LINES.findSame,
  picture: LINES.wordPicture,
  "sound-first": LINES.soundFirst,
  "sound-last": LINES.soundLast,
  blend: LINES.blend,
};

/** 보기가 그림인 놀이 */
const PICTURE_CHOICES: ChoiceVariant[] = ["picture", "sound-first", "sound-last", "blend"];

export function ChoiceRounds({ rounds, variant, assess, onDone }: { rounds: Round[]; variant: ChoiceVariant; assess: boolean; onDone: OnDone }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [state, setState] = useState<CardState>("idle");
  const [tried, setTried] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const later = useTimers();
  const turn = useTurn();
  const round = rounds[idx];

  useEffect(() => {
    void say([INTRO[variant], ...promptOf(variant, rounds[0])]);
    return () => stopVoice();
  }, [rounds, variant]);

  const advance = (nextScore: number) => {
    if (idx + 1 >= rounds.length) {
      onDone({ correct: nextScore, total: rounds.length });
      return;
    }
    setIdx(idx + 1);
    setPicked(null);
    setState("idle");
    setTried([]);
    void say(promptOf(variant, rounds[idx + 1]));
  };

  const choose = (c: string) => {
    if (state === "right" || state === "reveal" || tried.includes(c)) return;
    setPicked(c);
    const alive = turn();
    const name = [speakOf(c)];
    if (c === round.target) {
      const nextScore = tried.length === 0 ? score + 1 : score;
      setScore(nextScore);
      setState("right");
      void answerFeedback({ name, right: true, then: [pick(LINES.praise)], alive }).then((ok) => ok && later(() => advance(nextScore), 600));
      return;
    }
    if (assess) {
      setState("reveal");
      void answerFeedback({ name, right: false, then: [LINES.revealHere], alive }).then((ok) => ok && later(() => advance(score), 900));
      return;
    }
    setState("wrong");
    setTried((t) => [...t, c]);
    void answerFeedback({ name, right: false, then: [pick(LINES.retry), ...promptOf(variant, round)], alive });
    later(() => setState((s) => (s === "wrong" ? "idle" : s)), 600);
  };

  const hint = !assess && tried.length >= 2;
  const letterRound = isLetter(round.target);
  const pictures = PICTURE_CHOICES.includes(variant);

  return (
    <div className="flex h-full flex-col items-center justify-evenly gap-4 px-6 pb-6">
      {/* 묻는 쪽 */}
      <div key={idx} className="animate-pop-in">
        {(variant === "listen" || variant === "blend") && <SpeakerButton text={promptOf(variant, round)} size={168} pulse />}
        {(variant === "sound-first" || variant === "sound-last") && (
          <div className="flex items-center gap-5">
            <div className="squish grid place-items-center rounded-[3rem] p-5" style={toneStyle("lilac")}>
              <Picture item={round.word ?? ""} size="min(22vh, calc(17*var(--vw)))" />
            </div>
            <SpeakerButton text={promptOf(variant, round)} size={96} pulse />
          </div>
        )}
        {variant === "same" && (
          <div className="squish grid place-items-center rounded-[3rem] px-12 py-6" style={{ ...toneStyle("lilac"), minWidth: "min(30vh, calc(26*var(--vw)))" }}>
            {letterRound ? (
              <Glyph char={round.target} style={{ fontSize: "min(24vh, calc(20*var(--vw)))" }} />
            ) : (
              <span className="font-letter font-bold" style={{ fontSize: "min(12vh, calc(9*var(--vw)))" }}>
                {round.target}
              </span>
            )}
          </div>
        )}
        {variant === "picture" && (
          <div className="flex items-center gap-5">
            <div className="squish rounded-[3rem] px-14 py-6" style={toneStyle("butter")}>
              <span className="font-letter font-bold" style={{ fontSize: "min(13vh, calc(10*var(--vw)))" }}>
                {round.target}
              </span>
            </div>
            {!assess && <SpeakerButton text={round.target} size={84} />}
          </div>
        )}
      </div>

      {/* 고르는 쪽 */}
      <div className="flex flex-wrap items-center justify-center gap-6">
        {round.choices.map((c) => {
          const isTarget = c === round.target;
          const cs: CardState = picked === c ? state : state === "reveal" && isTarget ? "right" : "idle";
          const wasWrong = tried.includes(c);
          const tone = cs === "right" ? "mint" : cs === "wrong" || (state === "reveal" && picked === c) ? "peach" : "card";
          return (
            <SquishButton
              key={`${idx}-${c}`}
              tone={tone}
              aria-label={speakOf(c)}
              onClick={() => choose(c)}
              className={`relative grid place-items-center rounded-[2.5rem] ${cs === "wrong" ? "animate-shake" : ""} ${cs === "right" ? "animate-wiggle" : ""} ${
                hint && isTarget ? "animate-breathe ring-8 ring-butter" : ""
              }`}
              style={
                pictures
                  ? { width: "min(30vh, calc(24*var(--vw)))", height: "min(30vh, calc(24*var(--vw)))" }
                  : letterRound
                    ? { width: "min(25vh, calc(19*var(--vw)))", height: "min(25vh, calc(19*var(--vw)))" }
                    : { minWidth: "min(30vh, calc(24*var(--vw)))", padding: "min(4vh,calc(3*var(--vw))) min(5vh,calc(4*var(--vw)))" }
              }
            >
              {/* 틀린 카드는 그림·글자만 흐리게 — 이름표·✕ 는 또렷하게 */}
              <span className={`grid place-items-center ${wasWrong ? "opacity-45 grayscale" : ""}`}>
                {pictures ? (
                  <Picture item={c} size="min(22vh, calc(18*var(--vw)))" />
                ) : letterRound ? (
                  <Glyph char={c} style={{ fontSize: "min(17vh, calc(13*var(--vw)))" }} />
                ) : (
                  <span className="font-letter font-bold" style={{ fontSize: "min(9vh, calc(7*var(--vw)))" }}>
                    {c}
                  </span>
                )}
              </span>
              {cs === "right" && <span className="absolute -right-3 -top-3 grid h-14 w-14 place-items-center rounded-full bg-mint-deep text-3xl text-white">✓</span>}
              {wasWrong && <span className="absolute -right-2 -top-2 grid h-11 w-11 place-items-center rounded-full bg-peach-deep text-2xl text-white shadow">✕</span>}
              {/* 그림 카드는 누르면 낱말 이름표가 뜬다 */}
              {pictures && (wasWrong || cs === "right" || (state === "reveal" && picked === c)) && (
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 animate-pop-in whitespace-nowrap rounded-full bg-card px-4 py-1 font-letter text-[min(4.6vh,calc(3.3*var(--vw)))] font-bold text-ink shadow-[0_4px_0_var(--paper-deep)]">
                  {c}
                </span>
              )}
            </SquishButton>
          );
        })}
      </div>
    </div>
  );
}
