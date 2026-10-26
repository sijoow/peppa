"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Glyph, Picture } from "@/components/Art";
import { Icon } from "@/components/Icon";
import type { OnDone } from "@/components/play/types";
import { ReadAlong } from "@/components/ReadAlong";
import { SpeakerButton, SquishButton, toneAt, toneStyle } from "@/components/ui";
import type { PickRound } from "@/curriculum/freeContent";
import { isLetter, speakOf } from "@/curriculum/items";
import { LINES } from "@/curriculum/lines";
import { WORDS } from "@/curriculum/words";
import { imageOf } from "@/lib/assets";
import { sfx } from "@/lib/sfx";
import { useTimers } from "@/lib/useTimers";
import { say } from "@/lib/voice";
import { usePick } from "./usePick";

/** 이미 틀린 보기 — 흐리게 + ✕ */
const TRIED = "opacity-45 grayscale";
function TriedMark() {
  return <span className="absolute -right-2 -top-2 grid h-11 w-11 place-items-center rounded-full bg-peach-deep text-2xl text-white shadow">✕</span>;
}

/** 보기 이름표 — 그림 보기를 누르면 그 낱말이 아래에 뜬다 */
function NameTag({ text }: { text: string }) {
  return (
    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 animate-pop-in whitespace-nowrap rounded-full bg-card px-4 py-1 font-letter text-[min(4.6vh,calc(3.3*var(--vw)))] font-bold text-ink shadow-[0_4px_0_var(--paper-deep)]">
      {text}
    </span>
  );
}

function Face({ item, size }: { item: string; size: string }) {
  return isLetter(item) ? (
    <Glyph char={item} style={{ fontSize: size }} />
  ) : (
    <span className="font-letter font-bold" style={{ fontSize: `calc(${size} * 0.55)` }}>
      {item}
    </span>
  );
}

/** 으랏차 글자 광산 — 들은 글자가 든 바위를 세 번 톡톡 쳐서 깬다 */
export function MineGame({ rounds, onDone }: { rounds: PickRound[]; onDone: OnDone }) {
  const g = usePick(rounds, { intro: LINES.mine, prompt: (r) => [speakOf(r.say), LINES.whereIs], onDone, nameOf: (c) => [speakOf(c)] });
  const [cracks, setCracks] = useState<{ idx: number; n: number }>({ idx: -1, n: 0 });
  const crackOf = (c: string) => (cracks.idx === g.idx && c === g.round.answer ? cracks.n : 0);

  const hit = (c: string) => {
    if (g.state === "right") return;
    if (c !== g.round.answer) {
      g.choose(c);
      return;
    }
    const n = crackOf(c) + 1;
    sfx.clap();
    if (n < 3) {
      setCracks({ idx: g.idx, n });
      void say(n === 1 ? LINES.mineHit1 : LINES.mineHit2);
      return;
    }
    setCracks({ idx: g.idx, n: 3 });
    g.choose(c);
  };

  return (
    <div className="flex h-full flex-col items-center justify-evenly px-6 pb-6">
      <div className="flex items-center gap-4">
        <Icon emoji="⛏️" className="text-7xl" />
        <SpeakerButton text={[speakOf(g.round.say), LINES.whereIs]} size={110} pulse />
      </div>
      <div key={g.idx} className="flex flex-wrap justify-center gap-7 portrait:gap-5">
        {g.round.choices.map((c) => {
          const n = crackOf(c);
          const open = g.state === "right" && c === g.round.answer;
          return (
            <button
              key={c}
              type="button"
              onClick={() => hit(c)}
              aria-label={speakOf(c)}
              className={`relative grid h-[min(28vh,calc(20*var(--vw)))] w-[min(28vh,calc(20*var(--vw)))] place-items-center portrait:h-[min(40vw,11rem)] portrait:w-[min(40vw,11rem)] ${g.picked === c && g.state === "wrong" ? "animate-shake" : ""} ${
                n > 0 && !open ? "animate-wiggle" : ""
              } ${g.hint && c === g.round.answer ? "animate-breathe" : ""} ${g.tried.includes(c) ? TRIED : ""}`}
            >
              <span
                className="absolute inset-0 rounded-[42%_58%_52%_48%/55%_45%_55%_45%] shadow-[inset_-12px_-16px_0_rgb(0_0_0/0.12),0_12px_0_#8f8aa6]"
                style={{ background: open ? "linear-gradient(135deg,#d0f4ff,#b197fc)" : "#b9b4c9" }}
              />
              {n > 0 && !open && <span className="absolute inset-0 grid place-items-center text-[min(20vh,calc(14*var(--vw)))] text-white/70">{n === 1 ? "╱" : "✕"}</span>}
              <span className={`relative ${open ? "animate-pop-in text-ink" : "text-ink/75"}`}>
                <Face item={c} size="min(14vh, calc(10*var(--vw)))" />
              </span>
              {open && <span className="absolute -top-6 text-5xl"><Icon emoji="💎" /></span>}
              {g.tried.includes(c) && <TriedMark />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 말소리 정류장 — 버스 손님이 말한 글자의 첫 자음 정류장에 내려 준다 */
export function StationGame({ rounds, onDone }: { rounds: PickRound[]; onDone: OnDone }) {
  const g = usePick(rounds, { intro: LINES.station, prompt: (r) => [r.say], onDone, onRight: (r) => [r.say], nameOf: (c) => [speakOf(c)] });
  const stop = g.state === "right" ? g.round.choices.indexOf(g.round.answer) : -1;
  return (
    <div className="flex h-full flex-col items-center justify-evenly px-6 pb-6">
      <div className="relative h-[34%] w-full max-w-5xl">
        <div className="absolute bottom-6 left-0 right-0 h-5 rounded-full bg-ink/15" />
        <div
          key={g.idx}
          className="absolute bottom-8 flex items-end gap-3 transition-[left] duration-700 ease-out"
          style={{ left: stop >= 0 ? `${12 + stop * 33}%` : "2%" }}
        >
          <Icon emoji="🚌" className="text-[min(16vh,calc(11*var(--vw)))] leading-none" />
          <div className="mb-10 flex items-center gap-2 rounded-[1.5rem] bg-card px-4 py-2 shadow-[0_5px_0_var(--paper-deep)]">
            <span className="font-letter text-[min(8vh,calc(6*var(--vw)))] font-bold">{g.state === "right" ? g.round.say : "?"}</span>
            <SpeakerButton text={g.round.say} size={64} />
          </div>
        </div>
      </div>
      <div className="flex w-full max-w-5xl justify-around">
        {g.round.choices.map((c, i) => (
          <button
            key={`${g.idx}-${c}`}
            type="button"
            onClick={() => g.choose(c)}
            aria-label={speakOf(c)}
            className={`relative flex flex-col items-center ${g.picked === c && g.state === "wrong" ? "animate-shake" : ""} ${g.hint && c === g.round.answer ? "animate-breathe" : ""} ${
              g.tried.includes(c) ? TRIED : ""
            }`}
          >
            <span className="squish grid h-[min(22vh,calc(16*var(--vw)))] w-[min(22vh,calc(16*var(--vw)))] place-items-center rounded-full" style={toneStyle(c === g.round.answer && g.state === "right" ? "mint" : toneAt(i + 2))}>
              <Glyph char={c} style={{ fontSize: "min(13vh, calc(9*var(--vw)))" }} />
            </span>
            {g.tried.includes(c) && <TriedMark />}
            <span className="h-14 w-3 rounded-b-full bg-ink/40" />
          </button>
        ))}
      </div>
    </div>
  );
}

/** 골대 세 개의 가운데(골대 줄 폭에 대한 %) — justify-around 라서 1/6 · 3/6 · 5/6 */
const GOAL_X = [16.7, 50, 83.3];

/** 골키퍼 아빠 돼지 — 낱말 그림 "아빠"(페파풍)를 그대로 쓴다 */
function Keeper({ x, pose, fast }: { x: number; pose: "ready" | "dive" | "save"; fast: boolean }) {
  const src = imageOf("아빠");
  const lean = x < 50 ? -1 : 1;
  const transform = pose === "dive" ? `translateX(-50%) translateY(18%) rotate(${lean * 72}deg)` : pose === "save" ? "translateX(-50%) translateY(-14%) scale(1.08)" : "translateX(-50%)";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-[94%] z-10 h-[min(26vh,calc(18*var(--vw)))] w-[min(22vh,calc(15*var(--vw)))]"
      style={{ left: `${x}%`, transform, transition: `left ${fast ? 0.35 : 1.1}s ease-in-out, transform 0.35s ease-out` }}
    >
      <div className={`relative h-full w-full ${pose === "ready" ? "animate-keeper-bob" : ""}`}>
        {src ? <Image src={src} alt="" fill sizes="20vw" className="object-contain" draggable={false} /> : <span className="grid h-full place-items-center text-[min(16vh,calc(11*var(--vw)))]">🐷</span>}
        {/* 두 손에 골키퍼 장갑 */}
        <span className="absolute left-[2%] top-[38%] h-[16%] w-[22%] rounded-full border-[3px] border-[#c94f3d] bg-[#ff7a5c]" />
        <span className="absolute right-[2%] top-[38%] h-[16%] w-[22%] rounded-full border-[3px] border-[#c94f3d] bg-[#ff7a5c]" />
      </div>
    </div>
  );
}

/**
 * 단어 축구 — 들은 낱말이 적힌 골대로 공을 찬다. 골대 앞에서 골키퍼 아빠가 왔다 갔다 지킨다(2026-10-26 사용자 요청).
 * 맞는 골대로 차면 아빠가 반대쪽으로 몸을 날려 골인, 틀린 골대로 차면 아빠가 그 앞으로 가서 막는다.
 */
export function SoccerGame({ rounds, onDone }: { rounds: PickRound[]; onDone: OnDone }) {
  const g = usePick(rounds, { intro: LINES.soccer, prompt: (r) => [r.say], onDone, onRight: () => [LINES.goal], onWrong: () => [LINES.keeperSave], nameOf: (c) => [c] });
  const [shot, setShot] = useState<{ idx: number; at: number; saved: boolean } | null>(null);
  const [keeperX, setKeeperX] = useState(50);
  const later = useTimers();
  const live = shot && shot.idx === g.idx ? shot : null;
  const flying = live ? live.at : -1;

  // 공을 차기 전에는 아빠가 골대 앞을 왔다 갔다
  useEffect(() => {
    if (live) return;
    const t = window.setInterval(() => setKeeperX(18 + Math.random() * 64), 1300);
    return () => window.clearInterval(t);
  }, [live]);

  const kick = (c: string, i: number) => {
    if (g.state === "right" || live || g.tried.includes(c)) return;
    sfx.pop();
    const saved = c !== g.round.answer;
    const away = GOAL_X.filter((_, k) => k !== i);
    // 맞는 골대면 아빠는 다른 골대 쪽으로 몸을 날린다(판마다 번갈아)
    setKeeperX(saved ? GOAL_X[i] : away[g.idx % away.length]);
    setShot({ idx: g.idx, at: i, saved });
    later(() => {
      g.choose(c);
      // 막힌 공은 잠깐 뒤 제자리로
      if (saved) later(() => setShot(null), 1100);
    }, 450);
  };

  const ballMove =
    flying < 0
      ? "none"
      : live?.saved
        ? `translate(${(flying - 1) * 28}vw, -31vh) scale(0.8) rotate(300deg)`
        : `translate(${(flying - 1) * 28}vw, -42vh) scale(0.55) rotate(540deg)`;

  return (
    <div className="relative flex h-full flex-col items-center justify-between px-6 pb-8 pt-2">
      <div className="relative flex w-full max-w-5xl justify-around portrait:gap-2">
        <Keeper x={keeperX} pose={!live ? "ready" : live.saved ? "save" : "dive"} fast={!!live} />
        {g.round.choices.map((c, i) => (
          <button
            key={`${g.idx}-${c}`}
            type="button"
            onClick={() => kick(c, i)}
            className={`relative flex h-[min(30vh,calc(21*var(--vw)))] w-[min(40vh,calc(27*var(--vw)))] items-end justify-center rounded-t-3xl border-[10px] border-b-0 border-white bg-[repeating-linear-gradient(45deg,#ffffff55_0_6px,transparent_6px_18px),repeating-linear-gradient(-45deg,#ffffff55_0_6px,transparent_6px_18px)] pb-3 ${
              g.picked === c && g.state === "wrong" ? "animate-shake" : ""
            } ${g.hint && c === g.round.answer ? "animate-breathe" : ""} ${g.tried.includes(c) ? TRIED : ""}`}
            style={{ backgroundColor: c === g.round.answer && g.state === "right" ? "var(--mint)" : "var(--sky)" }}
          >
            <span className="whitespace-nowrap rounded-2xl bg-card px-4 py-1 font-letter text-[min(7vh,calc(5*var(--vw)))] font-bold shadow portrait:px-2 portrait:text-[1.55rem]">{c}</span>
            {g.tried.includes(c) && <TriedMark />}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-6">
        <SpeakerButton text={g.round.say} size={96} pulse />
        <span
          key={g.idx}
          className="text-[min(14vh,calc(10*var(--vw)))] leading-none transition-transform duration-500 ease-out"
          style={{ transform: ballMove }}
        >
          <Icon emoji="⚽" />
        </span>
      </div>
    </div>
  );
}

/** "🐻🧢" 같은 짝 — 동물 그림 위에 물건 그림을 작게 겹친다(둘 다 페파풍 낱말 그림) */
function FindMeArt({ pair }: { pair: string }) {
  const [who, what] = [...pair];
  return (
    <span className="relative inline-block text-[min(11vh,calc(8*var(--vw)))] leading-none portrait:text-[min(19vw,12vh)]">
      <Icon emoji={who} />
      {what && (
        <span className="absolute -right-[0.2em] -top-[0.15em] text-[0.6em]">
          <Icon emoji={what} />
        </span>
      )}
    </span>
  );
}

export type ReadSkin = "explain" | "find-me" | "read-answer";
const READ_INTRO: Record<ReadSkin, string> = { explain: LINES.explain, "find-me": LINES.findMe, "read-answer": LINES.readAnswer };

/** 그림 짝("🐻🧢")의 이름 — 낱말 그림 사전에서 찾는다: 곰 · 모자 */
const WORD_BY_EMOJI = new Map(WORDS.map((w) => [w.emoji.replace(/️/g, ""), w.text]));
const pairNames = (pair: string) => [...pair.replace(/️/g, "")].flatMap((e) => WORD_BY_EMOJI.get(e) ?? []);

/**
 * 읽기 이해 — 설명해 주세요(그림) · 나를 찾아줘(그림 속 친구) · 읽고 답해요(글 보기).
 * 문제 글은 페파가 읽어 주고, 읽는 곳까지 글자 색이 바뀐다(노래방 읽기). 스피커로 다시 듣는다.
 */
export function ReadGame({ skin, rounds, onDone }: { skin: ReadSkin; rounds: { text: string; question?: string; answer: string; choices: string[] }[]; onDone: OnDone }) {
  const g = usePick(rounds, {
    intro: READ_INTRO[skin],
    prompt: (r) => (r.question ? [r.text, r.question] : [r.text]),
    onDone,
    nameOf: (c) => (skin === "find-me" ? pairNames(c) : [c]),
  });
  const r = g.round;
  return (
    <div className="flex h-full flex-col items-center justify-evenly gap-4 px-6 pb-6">
      <div key={g.idx} className="flex max-w-5xl animate-pop-in items-start gap-4 rounded-[2.5rem] bg-card px-8 py-6 shadow-[0_8px_0_var(--paper-deep)] portrait:gap-2 portrait:px-5 portrait:py-4">
        <div className="font-letter text-[min(5.4vh,calc(3.6*var(--vw)))] font-bold leading-snug">
          <p>
            <ReadAlong text={r.text} />
          </p>
          {r.question && (
            <p className="mt-3 text-peach-deep">
              <ReadAlong text={r.question} />
            </p>
          )}
        </div>
        <SpeakerButton text={r.question ? [r.text, r.question] : r.text} size={76} />
      </div>
      <div className="flex flex-wrap justify-center gap-6 portrait:gap-4 portrait:[--card:min(40vw,24vh)] portrait:[--pic:min(28vw,17vh)]">
        {r.choices.map((c, i) => {
          const right = g.state === "right" && c === r.answer;
          const tried = g.tried.includes(c);
          return (
            <SquishButton
              key={`${g.idx}-${c}`}
              tone={right ? "mint" : skin === "read-answer" ? toneAt(i) : "card"}
              onClick={() => g.choose(c)}
              className={`relative grid place-items-center rounded-[2.5rem] px-8 py-5 ${g.picked === c && g.state === "wrong" ? "animate-shake" : ""} ${
                g.hint && c === r.answer ? "animate-breathe ring-8 ring-butter" : ""
              } ${right ? "animate-wiggle" : ""}`}
              style={skin === "read-answer" ? { minWidth: "min(30vh,calc(22*var(--vw)))" } : { width: "var(--card, min(27vh, calc(20*var(--vw))))", height: "var(--card, min(27vh, calc(20*var(--vw))))" }}
            >
              <span className={tried ? TRIED : ""}>
                {skin === "explain" && <Picture item={c} size="var(--pic, min(19vh, calc(14*var(--vw))))" />}
                {skin === "find-me" && <FindMeArt pair={c} />}
                {skin === "read-answer" && <span className="font-letter text-[min(6vh,calc(4.4*var(--vw)))] font-bold">{c}</span>}
              </span>
              {skin === "explain" && (tried || right) && <NameTag text={c} />}
              {tried && <TriedMark />}
              {right && <span className="absolute -right-3 -top-3 grid h-14 w-14 place-items-center rounded-full bg-mint-deep text-3xl text-white">✓</span>}
            </SquishButton>
          );
        })}
      </div>
    </div>
  );
}
