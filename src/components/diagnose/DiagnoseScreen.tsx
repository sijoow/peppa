"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Glyph } from "@/components/Art";
import { Peppa } from "@/components/Peppa";
import { ModeShell } from "@/components/ModeShell";
import { SpeakerButton, SquishButton } from "@/components/ui";
import { hasContent } from "@/curriculum/days";
import { DIAG_LEVELS, diagAnswer, diagItem, diagStart, type DiagState } from "@/curriculum/diagnose";
import { isLetter } from "@/curriculum/items";
import { LINES } from "@/curriculum/lines";
import { START_LEVELS } from "@/curriculum/outline";
import { localDay, restartAt } from "@/lib/progress";
import { sfx } from "@/lib/sfx";
import { updateSaved } from "@/lib/store";
import { say, stopVoice } from "@/lib/voice";

/**
 * 단원 찾기 퀴즈 — 아이가 풀고, 끝나면 부모에게 시작 단원을 추천한다.
 * 진단이라 맞았는지 틀렸는지는 알려 주지 않는다(기죽지 않게) — 고르면 '다음!' 하고 넘어간다.
 */
export default function DiagnoseScreen() {
  const router = useRouter();
  const [s, setS] = useState<DiagState | null>(null);
  const [applied, setApplied] = useState(false);
  const item = s ? diagItem(s) : null;

  useEffect(() => {
    void say(LINES.diagIntro);
    return () => stopVoice();
  }, []);

  const start = () => {
    sfx.wake();
    sfx.pop();
    const first = diagStart();
    setS(first);
    const it = diagItem(first);
    if (it) void say([LINES.diagListen, it.say]);
  };

  const answer = (choice: string) => {
    if (!s || !item) return;
    sfx.pop();
    const next = diagAnswer(s, choice === item.answer);
    setS(next);
    if (next.result === null) {
      const it = diagItem(next);
      if (it) void say([LINES.next, it.say]);
      return;
    }
    const unit = next.result;
    updateSaved((v) => ({ ...v, progress: { ...v.progress, diagnosed: { on: localDay(new Date()), unit } } }));
    sfx.cheer();
    void say(LINES.diagDone);
  };

  const result = s?.result ?? null;
  const level = START_LEVELS.find((l) => l.unit === result);

  return (
    <ModeShell title="단원 찾기 퀴즈" icon="🧭" iconId="menu:diagnose" onBack={() => router.push("/parent")}>
      {!s && (
        <div className="flex h-full flex-col items-center justify-center gap-6">
          <Peppa size={200} className="animate-float" />
          <p className="text-4xl">어떤 글자를 아는지 알아볼까?</p>
          <SquishButton tone="peach" className="rounded-full px-16 py-5 text-5xl" onClick={start}>
            시작!
          </SquishButton>
        </div>
      )}

      {s && item && (
        <div key={`${s.level}-${s.answered}`} className="flex h-full animate-pop-in flex-col items-center justify-evenly px-6 pb-6">
          <div className="flex items-center gap-6">
            {item.pic && <span className="text-[min(18vh,calc(14*var(--vw)))] leading-none">{item.pic}</span>}
            <SpeakerButton text={item.say} size={150} pulse />
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            {item.choices.map((c) => (
              <SquishButton key={c} tone="card" onClick={() => answer(c)} className="grid min-w-[min(26vh,calc(20*var(--vw)))] place-items-center rounded-[2.5rem] px-8 py-6">
                {isLetter(c) ? (
                  <Glyph char={c} style={{ fontSize: "min(15vh, calc(12*var(--vw)))" }} />
                ) : (
                  <span className="font-letter font-bold" style={{ fontSize: "min(9vh, calc(7*var(--vw)))" }}>
                    {c}
                  </span>
                )}
              </SquishButton>
            ))}
          </div>
          <div className="flex gap-2">
            {DIAG_LEVELS[s.level].items.map((_, i) => (
              <span key={i} className={`h-4 rounded-full ${i === s.answered ? "w-10 bg-peach-deep" : i < s.answered ? "w-4 bg-butter-deep" : "w-4 bg-paper-deep"}`} />
            ))}
          </div>
        </div>
      )}

      {result !== null && (
        <div className="flex h-full flex-col items-center justify-center gap-5 px-6">
          <Peppa size={180} mood="cheer" className="animate-float" />
          <p className="text-5xl">다 했어!</p>
          <div className="max-w-2xl rounded-[2rem] bg-card px-8 py-5 text-center font-body text-xl shadow-[0_6px_0_var(--paper-deep)]">
            <p>
              추천 시작: <b className="font-display text-3xl">{result}단원</b>
              {level && <span className="text-ink-soft"> · {level.label}</span>}
            </p>
            {level && <p className="mt-1 text-ink-soft">{level.desc}</p>}
            {!hasContent(result) && <p className="mt-2 text-peach-deep">{result}단원 하루치는 아직 준비 중이라, 시작 단원은 바꾸지 않았어요.</p>}
          </div>
          <div className="flex gap-4">
            {hasContent(result) && !applied && (
              <SquishButton
                tone="mint"
                className="rounded-full px-10 py-4 text-3xl"
                onClick={() => {
                  if (!window.confirm(`${result}단원부터 시작할까요? 오늘의 모험 진도가 ${result}단원 1일로 바뀌어요.`)) return;
                  updateSaved((v) => ({ ...v, progress: restartAt(v.progress, result) }));
                  setApplied(true);
                }}
              >
                {result}단원부터 시작
              </SquishButton>
            )}
            <SquishButton tone="card" className="rounded-full px-10 py-4 text-3xl" onClick={() => router.push(applied ? "/" : "/parent")}>
              {applied ? "아이 화면으로" : "부모 페이지로"}
            </SquishButton>
          </div>
        </div>
      )}
    </ModeShell>
  );
}
