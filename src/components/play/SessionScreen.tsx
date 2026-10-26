"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FireflyIcon } from "@/components/FireflyIcon";
import { Icon } from "@/components/Icon";
import { Peppa } from "@/components/Peppa";
import { ActivityHost } from "@/components/play/ActivityHost";
import { KIND_ICON } from "@/components/play/kindIcon";
import type { ActivityResult } from "@/components/play/types";
import { Backdrop, FireflyCount, PlayIcon, Splash, SquishButton } from "@/components/ui";
import { dayPlan } from "@/curriculum/days";
import { LINES } from "@/curriculum/lines";
import {
  canPlayToday,
  completeSession,
  currentSession,
  FIREFLY_PER_ACTIVITY,
  firefliesFor,
  localDay,
  passedOf,
  type SessionRef,
  type SessionResult,
} from "@/lib/progress";
import { currentAuth, useIsMaster } from "@/lib/auth";
import { buildSession, seededRng, type BuiltActivity } from "@/lib/rounds";
import { sfx } from "@/lib/sfx";
import { readSaved, updateSaved, useSaved, useToday } from "@/lib/store";
import { say, stopVoice } from "@/lib/voice";


type Phase =
  | { name: "ready" }
  | { name: "playing"; ref: SessionRef; built: BuiltActivity[]; idx: number; score: SessionResult; startedAt: number }
  | { name: "reward"; ref: SessionRef; earned: number; passed: boolean | null };

/**
 * ?preview=u1d6 — 부모 페이지 '미리 보기'. 진도에 남기지 않는다.
 *   &step=2  그 활동부터    &auto=1  시작 버튼 없이 바로(화면 점검용, 판 순서 고정)
 */
function readPreview(): { ref: SessionRef; step: number; auto: boolean } | null {
  const q = new URLSearchParams(window.location.search);
  const m = /^u(\d+)d(\d+)$/.exec(q.get("preview") ?? "");
  if (!m) return null;
  const plan = dayPlan(Number(m[1]), Number(m[2]));
  if (!plan) return null;
  const step = Math.max(0, Math.min(plan.activities.length - 1, Number(q.get("step")) || 0));
  return { ref: { key: "preview", review: false, plan }, step, auto: q.get("auto") === "1" };
}

function dayLabel(ref: SessionRef): string {
  const { unit, day, chapter } = ref.plan;
  if (ref.review) return `${unit}단원 ${chapter}장 · 복습 ${((day - 1) % 5) + 1}일째`;
  return `${unit}단원 · ${day}일째`;
}

export default function SessionScreen() {
  const saved = useSaved();
  const master = useIsMaster();
  const today = useToday();
  const router = useRouter();
  const [preview] = useState(readPreview);
  const [phase, setPhase] = useState<Phase>(() =>
    preview?.auto
      ? { name: "playing", ref: preview.ref, built: buildSession(preview.ref.plan, seededRng(1)), idx: preview.step, score: { correct: 0, total: 0, activities: 0 }, startedAt: 0 }
      : { name: "ready" },
  );
  const [askExit, setAskExit] = useState(false);

  useEffect(() => {
    const s = readSaved();
    const allowed = currentAuth()?.user.role === "master" || canPlayToday(s.progress, s.settings, localDay(new Date()));
    if (!preview?.auto) void say(allowed || preview ? LINES.sessionStart : LINES.doneToday);
    return () => stopVoice();
  }, [preview]);

  if (!saved) return <Splash />;

  const live = preview?.ref ?? currentSession(saved.progress);
  const allowed = preview || master ? true : canPlayToday(saved.progress, saved.settings, today);

  const start = () => {
    if (!live) return;
    sfx.wake();
    sfx.pop();
    setPhase({
      name: "playing",
      ref: live,
      built: buildSession(live.plan, seededRng(Date.now())),
      idx: preview?.step ?? 0,
      score: { correct: 0, total: 0, activities: 0 },
      startedAt: Date.now(),
    });
  };

  const finish = (ref: SessionRef, played: SessionResult, startedAt: number) => {
    // 걸린 시간 — 켜 두고 자리를 비운 날도 있으니 45분에서 자른다
    const score = { ...played, ms: startedAt ? Math.min(Date.now() - startedAt, 45 * 60_000) : 0 };
    let earned: number;
    let passed: boolean | null;
    if (preview) {
      earned = firefliesFor(ref.plan, score);
      passed = passedOf(ref.plan, score);
    } else {
      const res = completeSession(readSaved().progress, ref, score, today || localDay(new Date()));
      updateSaved((s) => ({ ...s, progress: res.next }));
      earned = res.record.fireflies;
      passed = res.record.passed;
    }
    setPhase({ name: "reward", ref, earned, passed });
    sfx.cheer();
    void say([LINES.sessionEnd, LINES.fireflies, ...(passed === true ? [LINES.assessPass] : passed === false ? [LINES.assessReview] : [])]);
  };

  const onActivityDone = (r: ActivityResult) => {
    if (phase.name !== "playing") return;
    const score = { correct: phase.score.correct + r.correct, total: phase.score.total + r.total, activities: phase.score.activities + 1 };
    if (phase.idx + 1 < phase.built.length) setPhase({ ...phase, idx: phase.idx + 1, score });
    else finish(phase.ref, score, phase.startedAt);
  };

  const goHome = () => {
    stopVoice();
    router.push("/");
  };

  if (phase.name === "playing") {
    return (
      <main className="relative flex h-dvh flex-col overflow-hidden">
        <Backdrop />
        <header className="relative z-10 flex items-center justify-between gap-4 px-5 pt-4 portrait:gap-2 portrait:px-3 portrait:pt-3">
          <button
            type="button"
            className="glass grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl font-extrabold text-ink-soft transition-transform active:scale-90 portrait:h-12 portrait:w-12 portrait:text-xl"
            onClick={() => setAskExit(true)}
            aria-label="그만하기"
          >
            ✕
          </button>
          <ol className="glass flex min-w-0 items-center gap-2 rounded-full px-3 py-1.5 portrait:gap-1 portrait:px-2 portrait:py-1" aria-label="오늘의 모험 순서">
            {phase.built.map((b, i) => (
              <li
                key={i}
                className={`grid place-items-center rounded-full transition-all ${
                  i < phase.idx
                    ? "h-11 w-11 bg-butter font-extrabold portrait:h-8 portrait:w-8"
                    : i === phase.idx
                      ? "h-14 w-14 animate-breathe bg-pink-soft ring-4 ring-pink portrait:h-10 portrait:w-10 portrait:ring-2"
                      : "h-11 w-11 bg-paper-deep/60 opacity-60 portrait:h-8 portrait:w-8"
                }`}
              >
                <span className={i === phase.idx ? "text-3xl portrait:text-2xl" : "text-xl portrait:text-base"}>{i < phase.idx ? "✓" : <Icon emoji={KIND_ICON[b.kind]} />}</span>
              </li>
            ))}
          </ol>
          <FireflyCount n={phase.score.activities * FIREFLY_PER_ACTIVITY} />
        </header>

        <section className="relative z-0 min-h-0 flex-1">
          <ActivityHost key={phase.idx} built={phase.built[phase.idx]} assess={phase.ref.plan.assess} onDone={onActivityDone} />
        </section>

        {askExit && (
          <div className="absolute inset-0 z-50 grid place-items-center bg-ink/30 backdrop-blur-sm">
            <div className="flex w-full max-w-md animate-pop-in flex-col items-center gap-5 rounded-[2.4rem] bg-white px-10 pb-8 pt-6 shadow-[0_30px_60px_-20px_rgb(62_58_82/0.5)] portrait:mx-4 portrait:px-6">
              <Peppa size={130} mood="wow" />
              <p className="text-4xl font-extrabold">그만할까?</p>
              <div className="flex w-full flex-col gap-3">
                <button type="button" className="cta w-full rounded-full py-4 text-3xl font-extrabold" onClick={() => setAskExit(false)}>
                  계속할래
                </button>
                <SquishButton tone="card" className="w-full rounded-full py-3.5 text-2xl" onClick={goHome}>
                  그만할래
                </SquishButton>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  if (phase.name === "reward") {
    const flies = Math.min(phase.earned, 12);
    return (
      <main className="relative grid h-dvh place-items-center overflow-hidden">
        <Backdrop />
        <div className="relative flex flex-col items-center gap-5">
          <div className="relative">
            <Peppa size={230} mood="cheer" className="animate-float" />
            {Array.from({ length: flies }, (_, i) => {
              const a = Math.PI * (0.08 + (0.84 * i) / Math.max(1, flies - 1));
              return (
                <span
                  key={i}
                  className="absolute animate-fly-up"
                  style={{ left: `${50 - 70 * Math.cos(a)}%`, top: `${45 - 55 * Math.sin(a)}%`, animationDelay: `${0.3 + i * 0.12}s` }}
                >
                  <FireflyIcon size={42} />
                </span>
              );
            })}
          </div>
          <p className="peppa-title text-6xl portrait:text-5xl">오늘의 모험 끝!</p>
          <div className="glass flex items-center gap-3 rounded-full px-8 py-3 text-5xl font-extrabold">
            <FireflyIcon size={60} /> +{phase.earned}
          </div>
          {phase.passed === true && <p className="rounded-full bg-mint px-7 py-2 text-3xl">확인 놀이 통과! <Icon emoji="⭐" /></p>}
          {phase.passed === false && <p className="rounded-full bg-lilac px-7 py-2 text-3xl">다음에는 복습 놀이를 해요</p>}
          {preview && <p className="font-body text-xl text-ink-soft">미리 보기라 진도에는 남지 않았어요</p>}
          <button type="button" className="cta mt-2 rounded-full px-16 py-5 text-4xl font-extrabold" onClick={goHome}>
            집으로
          </button>
        </div>
      </main>
    );
  }

  // 준비 화면
  return (
    <main className="relative grid h-dvh place-items-center overflow-hidden">
      <Backdrop />
      <button
        type="button"
        className="glass absolute left-5 top-4 z-10 grid h-14 w-14 place-items-center rounded-full text-3xl transition-transform active:scale-90 portrait:left-3 portrait:top-3 portrait:h-12 portrait:w-12"
        onClick={goHome}
        aria-label="집으로"
      >
        <Icon emoji="🏠" />
      </button>
      {preview && <div className="glass absolute right-6 top-5 z-10 rounded-full px-5 py-2 font-body text-lg portrait:right-3 portrait:top-3 portrait:text-sm">미리 보기 · 진도에 남지 않아요</div>}
      <div className="relative flex flex-col items-center gap-6">
        <Peppa size={210} className="animate-float" />
        {live ? (
          <>
            <div className="glass flex w-[min(92vw,30rem)] flex-col items-center rounded-[2.2rem] px-8 pb-7 pt-5 text-center">
              <span className="rounded-full bg-pink-soft px-3 py-1 text-sm font-extrabold text-pink-deep">{dayLabel(live)}</span>
              <p className="mt-2 text-[2.6rem] font-extrabold leading-tight break-keep portrait:text-4xl">{live.plan.title}</p>
              {(live.plan.assess || live.review) && (
                <div className="mt-2 flex gap-2">
                  {live.plan.assess && (
                    <span className="rounded-full bg-butter px-3 py-1 text-base font-bold">
                      <Icon emoji="⭐" /> 확인 놀이 날
                    </span>
                  )}
                  {live.review && <span className="rounded-full bg-lilac px-3 py-1 text-base font-bold">복습 놀이</span>}
                </div>
              )}
              {allowed ? (
                <button type="button" onClick={start} className="cta mt-6 flex w-full items-center justify-center gap-3 rounded-full py-4 text-[2rem] font-extrabold">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-white/95 text-2xl text-pink">
                    <PlayIcon />
                  </span>
                  시작하기
                </button>
              ) : (
                <p className="mt-5 rounded-full bg-paper px-6 py-2.5 text-2xl font-bold">
                  오늘 모험 끝! 내일 또 만나 <Icon emoji="🌙" />
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="glass rounded-full px-8 py-3 text-3xl font-bold">
            다음 모험을 준비하고 있어요 <Icon emoji="✨" />
          </p>
        )}
      </div>
    </main>
  );
}
