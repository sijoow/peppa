"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FireflyIcon } from "@/components/FireflyIcon";
import { Icon } from "@/components/Icon";
import { Peppa } from "@/components/Peppa";
import { ReadAlong } from "@/components/ReadAlong";
import { Backdrop, FireflyCount, PlayIcon, SpeechBubble, Splash, toneStyle, usePortrait } from "@/components/ui";
import { CHILD } from "@/curriculum/child";
import { LINES } from "@/curriculum/lines";
import { MENUS, type MenuId } from "@/curriculum/menus";
import { FREE_GAMES, GALAXIES } from "@/curriculum/modes";
import { chapterOfDay, stageOutline, unitOutline } from "@/curriculum/outline";
import type { UnitOutline } from "@/curriculum/types";
import { imageOf } from "@/lib/assets";
import { useIsMaster } from "@/lib/auth";
import { isOpen } from "@/lib/play";
import { canPlayToday, currentSession, type Progress } from "@/lib/progress";
import { sfx } from "@/lib/sfx";
import { useSaved, useToday } from "@/lib/store";
import { say } from "@/lib/voice";

/*
 * 첫 화면 — 우리 식으로 정리(2026-10-26 사용자: 토도를 따를 필요 없이 편하고 직관적으로, 지금 메인은 촌스럽다).
 *   위    하온이 이름표 · 반딧불이 · 부모 문(꾹)
 *   가운데 페파(누르면 이름을 불러 준다) + 「오늘의 모험」 카드 하나 — 장 제목, 이번 단원 하루하루 점, 분홍 시작 버튼
 *   아래  유리 메뉴 바 — 놀이터 · 도전 · 우주 여행 · 책 읽기 · 그리기(curriculum/menus)
 * 가로 화면은 페파(왼쪽) · 카드(오른쪽), 세로 화면은 위아래.
 */

/** "글자 학습 준비 (기기 익히기)" → ["글자 학습 준비", "기기 익히기"] */
function splitTitle(title: string): [string, string] {
  const m = /^(.*?)\s*\((.*)\)\s*$/.exec(title);
  return m ? [m[1], m[2]] : [title, ""];
}

/** 부모 페이지 문 — 아이가 실수로 열지 않게 1.5초 꾹 눌러야 열린다 */
function ParentGate() {
  const router = useRouter();
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const end = () => {
    setHolding(false);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  return (
    <button
      type="button"
      aria-label="부모 페이지 (꾹 누르기)"
      onPointerDown={() => {
        setHolding(true);
        timer.current = window.setTimeout(() => router.push("/parent"), 1500);
      }}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
      className="glass relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink-soft"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" strokeLinecap="round" />
      </svg>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden>
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="none"
          stroke="var(--pink)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="139"
          strokeDashoffset={holding ? 0 : 139}
          style={{ transition: holding ? "stroke-dashoffset 1.5s linear" : "none" }}
        />
      </svg>
    </button>
  );
}

/**
 * 하온이 이름표 — 얼굴 동그라미 + 지금 어디쯤인지(작게).
 * 얼굴은 보이스동화(fe)에서 고정한 하온이 그림을 잘라 쓴 것("child:face", 2026-10-26). 없으면 이름 첫 글자
 */
function NameTag({ sub, master }: { sub: string; master: boolean }) {
  const face = imageOf("child:face");
  return (
    <div className="glass flex min-w-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 portrait:pr-4">
      <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-pink text-xl font-extrabold text-white ring-2 ring-pink short:h-9 short:w-9 short:text-lg">
        {face ? <Image src={face} alt={CHILD.nick} fill sizes="48px" className="object-cover" /> : [...CHILD.full][1]}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="flex items-center gap-1 text-xl font-extrabold short:text-lg">
          {CHILD.nick}
          {master && <Icon emoji="👑" />}
        </span>
        <span className="block truncate text-sm font-semibold text-ink-soft">{sub}</span>
      </span>
    </div>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="0.95em" height="0.95em" aria-hidden>
      <path d="M12 3.2l2.6 5.3 5.8.85-4.2 4.1 1 5.8L12 16.5l-5.2 2.75 1-5.8-4.2-4.1 5.8-.85z" fill="currentColor" />
    </svg>
  );
}

/**
 * 이번 단원 하루하루 — 끝낸 날은 반딧불이, 오늘은 분홍, 확인 놀이 날(5일마다)은 별.
 * 마스터는 점을 눌러 그날을 미리 본다.
 */
function DayTrack({ unit, progress, reviewChapter, onPick }: { unit: UnitOutline; progress: Progress; reviewChapter: number | null; onPick?: (day: number) => void }) {
  const isDone = (d: number) => progress.unit > unit.id || (progress.unit === unit.id && d < progress.day);
  const today = reviewChapter === null && progress.unit === unit.id ? progress.day : null;
  return (
    <div className="flex items-center justify-between gap-1">
      {Array.from({ length: unit.days }, (_, i) => i + 1).map((d) => {
        const done = isDone(d);
        const here = today === d;
        const review = reviewChapter !== null && chapterOfDay(d) === reviewChapter;
        const dot = (
          <span
            className={`grid place-items-center rounded-full font-extrabold ${
              here
                ? "h-10 w-10 animate-breathe bg-pink text-lg text-white ring-4 ring-pink-soft portrait:h-9 portrait:w-9"
                : done
                  ? "h-8 w-8 bg-butter portrait:h-7 portrait:w-7"
                  : review
                    ? "h-8 w-8 bg-lilac text-sm text-ink portrait:h-7 portrait:w-7"
                    : "h-8 w-8 bg-paper-deep/70 text-sm text-ink-soft portrait:h-7 portrait:w-7"
            }`}
          >
            {here ? d : done ? <FireflyIcon className="h-6 w-6 portrait:h-5 portrait:w-5" /> : d % 5 === 0 ? <StarIcon /> : d}
          </span>
        );
        return onPick ? (
          <button key={d} type="button" aria-label={`${d}일 미리 보기`} onClick={() => onPick(d)}>
            {dot}
          </button>
        ) : (
          <span key={d}>{dot}</span>
        );
      })}
    </div>
  );
}

export default function HomeScreen() {
  const saved = useSaved();
  const master = useIsMaster();
  const today = useToday();
  const router = useRouter();
  // 페파를 눌렀을 때 한 말 — 말풍선에 그대로 보이고, 읽는 곳까지 색이 바뀐다. 누르기 전에는 평소 말
  const [line, setLine] = useState<string | null>(null);
  const helloAt = useRef(0);
  const portrait = usePortrait();

  if (!saved) return <Splash />;

  const { progress, settings } = saved;
  const session = currentSession(progress);
  const unitNo = session?.plan.unit ?? progress.unit;
  const unit = unitOutline(unitNo);
  const stage = unit ? stageOutline(unit.stage) : undefined;
  const can = master || canPlayToday(progress, settings, today);
  const chapter = session ? unit?.chapters.find((c) => c.no === session.plan.chapter) : undefined;
  const bubble = line ?? (!session ? "다음 모험을 준비하고 있어!" : can ? "오늘의 모험을 떠나 볼까?" : "오늘 모험은 끝! 내일 또 만나!");
  const [chapterMain, chapterSub] = chapter ? splitTitle(chapter.title) : ["", ""];
  const reviewChapter = session?.review ? session.plan.chapter : null;

  /** 페파를 누르면 하온이 이름을 부르며 말한다 — 인사말을 차례로(2026-10-26 사용자: 이름은 누를 때만) */
  const greet = () => {
    sfx.wake();
    sfx.pop();
    const text = !session || !can ? LINES.doneToday : LINES.hello[helloAt.current++ % LINES.hello.length];
    setLine(text);
    void say(text);
  };

  const goto = (href: string) => {
    sfx.wake();
    sfx.pop();
    router.push(href);
  };

  const opened: Record<MenuId, boolean> = {
    free: FREE_GAMES.some((g) => isOpen(saved, g.opens, master)),
    missions: true,
    galaxy: GALAXIES.some((g) => isOpen(saved, g.opens, master)),
    reading: true,
    studio: true,
  };

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden">
      <Backdrop scene="home" />
      {/* 위쪽 하늘을 살짝 밝게 — 이름표·숫자가 바탕에 묻히지 않게 */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-white/45 to-transparent" />

      <header className="relative z-10 flex items-center justify-between gap-2 px-5 pt-4 short:px-4 short:pt-2 portrait:px-3 portrait:pt-3">
        <NameTag sub={`${stage?.id ?? 1}단계 · ${unitNo}단원`} master={master} />
        <div className="flex items-center gap-2">
          <FireflyCount n={progress.fireflies} />
          <ParentGate />
        </div>
      </header>

      <section className="relative z-10 flex min-h-0 flex-1 items-center justify-center gap-[5vw] px-8 short:gap-6 short:px-5 portrait:flex-col portrait:justify-evenly portrait:gap-0 portrait:px-4">
        {/* 페파 + 말풍선 */}
        <div className="flex shrink-0 flex-col items-center">
          <SpeechBubble tail="down" className="mb-3 max-w-[min(86vw,24rem)] short:mb-1 short:px-4 short:py-2 short:text-xl portrait:text-2xl">
            <ReadAlong text={bubble} />
          </SpeechBubble>
          <button type="button" onClick={greet} aria-label="페파">
            <Peppa size={portrait ? 150 : 220} className="animate-float" />
          </button>
        </div>

        {/* 오늘의 모험 카드 */}
        <div className="glass w-full max-w-[31rem] rounded-[2.2rem] p-6 short:max-w-[24rem] short:rounded-[1.6rem] short:p-3.5 portrait:p-5">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${can && session ? "bg-pink-soft text-pink-deep" : "bg-mint/70 text-ink"}`}>
              {!session ? "준비 중" : can ? "오늘의 모험" : "오늘 모험 끝!"}
            </span>
            {session?.review && <span className="rounded-full bg-lilac px-3 py-1 text-sm font-extrabold">복습 {((session.plan.day - 1) % 5) + 1}/5</span>}
            {session && !session.review && <span className="ml-auto text-sm font-bold text-ink-soft">{unitNo}단원 · {session.plan.day}일째</span>}
          </div>

          {chapter ? (
            <>
              <h2 className="mt-3 text-[2rem] font-extrabold leading-tight break-keep short:mt-1.5 short:text-2xl portrait:text-[1.7rem]">
                {chapter.no}장 · {chapterMain}
              </h2>
              {chapterSub && <p className="mt-0.5 text-lg font-semibold text-ink-soft short:text-base">{chapterSub}</p>}
            </>
          ) : (
            <h2 className="mt-3 text-[1.8rem] font-extrabold leading-tight">다음 모험을 준비하고 있어요</h2>
          )}

          {unit && (
            <div className="mt-5 short:mt-2.5">
              <DayTrack unit={unit} progress={progress} reviewChapter={reviewChapter} onPick={master ? (d) => router.push(`/play?preview=u${unit.id}d${d}`) : undefined} />
            </div>
          )}

          {session &&
            (can ? (
              <button type="button" onClick={() => goto("/play")} className="cta mt-6 flex w-full items-center justify-center gap-3 rounded-full py-4 text-[2rem] font-extrabold short:mt-3 short:py-2.5 short:text-2xl">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white/95 text-2xl text-pink short:h-9 short:w-9 short:text-xl">
                  <PlayIcon />
                </span>
                시작하기
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goto("/free")}
                className="squish mt-6 flex w-full items-center justify-center gap-2 rounded-full py-4 text-2xl font-extrabold short:mt-3 short:py-2.5"
                style={toneStyle("sky")}
              >
                <Icon emoji="🌙" /> 내일 또 만나요 · 놀이터 가기
              </button>
            ))}
        </div>
      </section>

      {/* 메뉴 바 — 아이가 알아듣는 장소 이름(curriculum/menus) */}
      <nav
        className="glass relative z-10 mx-auto mb-4 flex shrink-0 items-stretch gap-1 rounded-[2rem] p-2 short:mb-2 short:p-1.5 portrait:mb-3 portrait:w-[calc(100%-1.25rem)]"
        aria-label="메뉴"
      >
        {MENUS.map((m) => {
          const open = opened[m.id];
          return (
            <button
              key={m.id}
              type="button"
              className="flex w-[6.6rem] flex-col items-center gap-1 rounded-[1.5rem] px-1 pb-1.5 pt-2 transition-transform hover:bg-white/80 active:scale-95 short:w-auto short:flex-row short:gap-2 short:px-3 short:py-1 portrait:w-auto portrait:flex-1 portrait:px-0"
              onClick={() => {
                sfx.wake();
                if (!open) {
                  sfx.boop();
                  void say(LINES.locked);
                  return;
                }
                goto(m.href);
              }}
            >
              <span
                className="relative grid h-14 w-14 place-items-center rounded-[1.2rem] text-[2.6rem] short:h-10 short:w-10 short:rounded-[0.9rem] short:text-[1.9rem] portrait:h-12 portrait:w-12 portrait:text-[2.2rem]"
                style={{ background: `var(--${m.tone})` }}
              >
                <Icon id={`menu:${m.id}`} emoji={m.icon} className={open ? "" : "opacity-40 grayscale"} />
                {!open && (
                  <span className="absolute -right-1.5 -top-1.5 text-lg">
                    <Icon emoji="🔒" />
                  </span>
                )}
              </span>
              <span className="whitespace-nowrap text-[0.95rem] font-extrabold text-ink portrait:text-[0.82rem]">{m.title}</span>
            </button>
          );
        })}
      </nav>
    </main>
  );
}
