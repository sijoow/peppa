"use client";

import { useEffect, useState } from "react";
import { Glyph, Picture } from "@/components/Art";
import { Icon } from "@/components/Icon";
import type { OnDone } from "@/components/play/types";
import { boardWidth, TraceBoard, useBoardKey } from "@/components/TraceBoard";
import { SpeakerButton, SquishButton, toneAt } from "@/components/ui";
import { makeSyllable, type ComposeRound } from "@/curriculum/freeContent";
import { decompose, vowelSide } from "@/curriculum/hangul";
import { LINES } from "@/curriculum/lines";
import { sfx } from "@/lib/sfx";
import { useTimers } from "@/lib/useTimers";
import { pick, say, stopVoice } from "@/lib/voice";

/** 라운드 진행 공통 — 맞히면 다음 판, 다 하면 끝 (첫 시도에 맞힌 수가 점수) */
function useRounds(total: number, onDone: OnDone) {
  const [idx, setIdx] = useState(0);
  const [misses, setMisses] = useState(0);
  const [score, setScore] = useState(0);
  const [right, setRight] = useState(false);
  const later = useTimers();
  const win = (sayFirst: string[], next: () => void) => {
    const s = misses === 0 ? score + 1 : score;
    setScore(s);
    setRight(true);
    sfx.ding();
    void say([...sayFirst, pick(LINES.praise)]);
    later(() => {
      setRight(false);
      setMisses(0);
      if (idx + 1 >= total) {
        onDone({ correct: s, total });
        return;
      }
      setIdx(idx + 1);
      next();
    }, 1700);
  };
  const miss = () => {
    sfx.boop();
    setMisses((m) => m + 1);
  };
  return { idx, misses, right, win, miss, later };
}

/** 조각 조각 붙여요 — 글자 조각을 차례로 눌러 낱말을 완성한다 */
export function PiecesGame({ rounds, onDone }: { rounds: { word: string; tiles: string[] }[]; onDone: OnDone }) {
  const g = useRounds(rounds.length, onDone);
  const r = rounds[g.idx];
  const [slots, setSlots] = useState<(number | null)[]>(() => rounds[0].tiles.map(() => null));
  const [shake, setShake] = useState(false);

  useEffect(() => {
    void say([LINES.pieces, rounds[0].word]);
    return () => stopVoice();
  }, [rounds]);

  const used = new Set(slots.filter((s): s is number => s !== null));
  const empty = slots.indexOf(null);
  const hintTile = g.misses >= 2 && empty >= 0 ? r.tiles.findIndex((t, i) => !used.has(i) && t === [...r.word][empty]) : -1;

  const place = (ti: number) => {
    if (g.right || used.has(ti) || empty < 0) return;
    sfx.pop();
    void say(r.tiles[ti]);
    const next = slots.map((s, i) => (i === empty ? ti : s));
    setSlots(next);
    if (next.some((s) => s === null)) return;
    const made = next.map((s) => r.tiles[s as number]).join("");
    if (made === r.word) {
      g.win([r.word], () => {
        const nr = rounds[g.idx + 1];
        setSlots(nr.tiles.map(() => null));
        void say(nr.word);
      });
      return;
    }
    g.miss();
    setShake(true);
    void say([pick(LINES.retry), r.word]);
    g.later(() => {
      setShake(false);
      setSlots(r.tiles.map(() => null));
    }, 900);
  };

  const unplace = (si: number) => {
    if (g.right || slots[si] === null) return;
    sfx.tick();
    setSlots(slots.map((s, i) => (i === si ? null : s)));
  };

  return (
    <div className="flex h-full flex-col items-center justify-evenly px-6 pb-6">
      <div key={g.idx} className="flex animate-pop-in items-center gap-5">
        <Picture item={r.word} size="min(22vh, calc(16*var(--vw)))" />
        <SpeakerButton text={r.word} size={84} />
      </div>
      <div className={`flex gap-4 ${shake ? "animate-shake" : ""}`}>
        {slots.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => unplace(i)}
            className={`grid h-[min(20vh,calc(14*var(--vw)))] w-[min(20vh,calc(14*var(--vw)))] place-items-center rounded-[2rem] border-[6px] ${
              s === null ? "border-dashed border-ink/20 bg-card/60" : g.right ? "border-mint-deep bg-mint" : "border-transparent bg-butter"
            }`}
          >
            {s !== null && <span className="font-letter text-[min(11vh,calc(8*var(--vw)))] font-bold">{r.tiles[s]}</span>}
          </button>
        ))}
      </div>
      <div className="flex gap-4">
        {r.tiles.map((t, i) => (
          <SquishButton
            key={`${g.idx}-${i}`}
            tone={toneAt(i + 1)}
            disabled={used.has(i)}
            onClick={() => place(i)}
            className={`grid h-[min(17vh,calc(12*var(--vw)))] w-[min(17vh,calc(12*var(--vw)))] place-items-center rounded-[1.8rem] ${hintTile === i ? "animate-breathe ring-8 ring-butter" : ""}`}
          >
            <span className="font-letter text-[min(9vh,calc(6.5*var(--vw)))] font-bold">{t}</span>
          </SquishButton>
        ))}
      </div>
    </div>
  );
}

/** 처음 고른 자음·모음이 우연히 정답이면 하나 비켜 둔다 */
function startIndex(r: ComposeRound): [number, number] {
  return makeSyllable(r.consonants[0], r.vowels[0]) === r.target ? [0, 1] : [0, 0];
}

/** 돌려라 글자판 — 자음판·모음판을 돌려 들은 글자를 만든다. 돌릴 때마다 만들어진 글자를 읽어 준다 */
export function WheelGame({ rounds, onDone }: { rounds: ComposeRound[]; onDone: OnDone }) {
  const g = useRounds(rounds.length, onDone);
  const r = rounds[g.idx];
  const [pos, setPos] = useState<[number, number]>(() => startIndex(rounds[0]));
  const made = makeSyllable(r.consonants[pos[0]], r.vowels[pos[1]]);

  useEffect(() => {
    void say([LINES.wheel, rounds[0].target]);
    return () => stopVoice();
  }, [rounds]);

  const turn = (wheel: 0 | 1, dir: 1 | -1) => {
    if (g.right) return;
    const len = wheel === 0 ? r.consonants.length : r.vowels.length;
    const next: [number, number] = [...pos];
    next[wheel] = (next[wheel] + dir + len) % len;
    setPos(next);
    sfx.tick();
    void say(makeSyllable(r.consonants[next[0]], r.vowels[next[1]]));
  };

  const check = () => {
    if (g.right) return;
    if (made === r.target) {
      g.win([made], () => setPos(startIndex(rounds[g.idx + 1])));
      return;
    }
    g.miss();
    void say([LINES.made, made, pick(LINES.retry), r.target]);
  };

  const wheel = (items: string[], at: number, w: 0 | 1) => (
    <div className="flex flex-col items-center gap-2">
      <SquishButton tone="card" className="h-16 w-24 rounded-full text-3xl" onClick={() => turn(w, -1)} aria-label="위로">
        ▲
      </SquishButton>
      <div className="relative grid h-[min(26vh,calc(18*var(--vw)))] w-[min(22vh,calc(15*var(--vw)))] place-items-center overflow-hidden rounded-[2rem] bg-card shadow-[inset_0_10px_14px_rgb(0_0_0/0.08)] portrait:h-[11rem] portrait:w-[8.5rem]">
        <span className="absolute top-1 text-[min(5vh,calc(3.4*var(--vw)))] text-ink/25">{items[(at - 1 + items.length) % items.length]}</span>
        <Glyph char={items[at]} style={{ fontSize: "min(13vh, calc(9*var(--vw)))" }} />
        <span className="absolute bottom-1 text-[min(5vh,calc(3.4*var(--vw)))] text-ink/25">{items[(at + 1) % items.length]}</span>
      </div>
      <SquishButton tone="card" className="h-16 w-24 rounded-full text-3xl" onClick={() => turn(w, 1)} aria-label="아래로">
        ▼
      </SquishButton>
    </div>
  );

  return (
    <div className="flex h-full items-center justify-center gap-10 px-6 pb-6 portrait:flex-wrap portrait:content-center portrait:gap-x-4 portrait:gap-y-5 portrait:px-4">
      <div className="flex flex-col items-center gap-4 portrait:basis-full portrait:flex-row portrait:justify-center">
        <SpeakerButton text={r.target} size={110} pulse />
        <span className="text-2xl text-ink-soft">듣고 만들기</span>
      </div>
      {wheel(r.consonants, pos[0], 0)}
      <span className="text-6xl text-ink-soft portrait:text-5xl">+</span>
      {wheel(r.vowels, pos[1], 1)}
      <span className="text-6xl text-ink-soft portrait:hidden">=</span>
      <div className="flex flex-col items-center gap-4 portrait:basis-full portrait:flex-row portrait:justify-center portrait:gap-5">
        <div className={`grid h-[min(28vh,calc(19*var(--vw)))] w-[min(28vh,calc(19*var(--vw)))] place-items-center rounded-[2.5rem] ${g.right ? "animate-wiggle bg-mint" : "bg-butter"}`}>
          <span className="font-letter text-[min(17vh,calc(12*var(--vw)))] font-bold">{made}</span>
        </div>
        <SquishButton tone="peach" className="rounded-full px-8 py-3 text-3xl" onClick={check}>
          완성!
        </SquishButton>
      </div>
    </div>
  );
}

/** 모여라 자음 모음 — 자음은 자음 자리, 모음은 모음 자리에 넣어 들은 글자를 완성한다 */
export function AssembleGame({ rounds, onDone }: { rounds: ComposeRound[]; onDone: OnDone }) {
  const g = useRounds(rounds.length, onDone);
  const r = rounds[g.idx];
  const [cho, setCho] = useState<string | null>(null);
  const [jung, setJung] = useState<string | null>(null);
  const side = vowelSide(decompose(r.target)?.jung ?? "ㅏ");
  const pieces = [...r.consonants.map((c) => ({ c, kind: "cho" as const })), ...r.vowels.map((c) => ({ c, kind: "jung" as const }))];

  useEffect(() => {
    void say([LINES.assemble, rounds[0].target]);
    return () => stopVoice();
  }, [rounds]);

  const put = (c: string, kind: "cho" | "jung") => {
    if (g.right) return;
    sfx.pop();
    const nc = kind === "cho" ? c : cho;
    const nj = kind === "jung" ? c : jung;
    if (kind === "cho") setCho(c);
    else setJung(c);
    if (!nc || !nj) return;
    const made = makeSyllable(nc, nj);
    if (made === r.target) {
      g.win([made], () => {
        setCho(null);
        setJung(null);
        void say(rounds[g.idx + 1].target);
      });
      return;
    }
    g.miss();
    void say([LINES.made, made, pick(LINES.retry), r.target]);
  };

  const slot = (v: string | null, label: string) => (
    <div className={`grid h-[min(19vh,calc(13*var(--vw)))] w-[min(19vh,calc(13*var(--vw)))] place-items-center rounded-[1.6rem] border-[6px] ${v ? "border-transparent bg-card" : "border-dashed border-ink/25"}`}>
      {v ? <Glyph char={v} style={{ fontSize: "min(12vh, calc(8*var(--vw)))" }} /> : <span className="text-2xl text-ink-soft">{label}</span>}
    </div>
  );

  return (
    <div className="flex h-full flex-col items-center justify-evenly px-6 pb-6">
      <div className="flex items-center gap-8">
        <SpeakerButton text={r.target} size={104} pulse />
        <div className={`flex gap-3 rounded-[2.5rem] p-5 ${g.right ? "animate-wiggle bg-mint" : "bg-butter"} ${side === "right" ? "flex-row" : "flex-col"}`}>
          {slot(cho, "자음")}
          {slot(jung, "모음")}
        </div>
        {cho && jung && <span className="font-letter text-[min(16vh,calc(11*var(--vw)))] font-bold">{makeSyllable(cho, jung)}</span>}
      </div>
      <div className="flex flex-wrap justify-center gap-5">
        {pieces.map((p, i) => (
          <SquishButton
            key={`${g.idx}-${p.c}`}
            tone={p.kind === "cho" ? "sky" : "rose"}
            onClick={() => put(p.c, p.kind)}
            className={`grid h-[min(17vh,calc(12*var(--vw)))] w-[min(17vh,calc(12*var(--vw)))] place-items-center rounded-[1.8rem] ${
              g.misses >= 2 && (p.c === decompose(r.target)?.cho || p.c === decompose(r.target)?.jung) ? "animate-breathe ring-8 ring-butter" : ""
            }`}
            style={{ order: i % 2 ? i : -i }}
          >
            <Glyph char={p.c} style={{ fontSize: "min(10vh, calc(7*var(--vw)))" }} />
          </SquishButton>
        ))}
      </div>
    </div>
  );
}

/** 마법의 솥 — 자음 하나, 모음 하나를 솥에 넣고 저으면 글자가 퐁! */
export function CauldronGame({ rounds, onDone }: { rounds: ComposeRound[]; onDone: OnDone }) {
  const g = useRounds(rounds.length, onDone);
  const r = rounds[g.idx];
  const [cho, setCho] = useState<string | null>(null);
  const [jung, setJung] = useState<string | null>(null);
  const [brewing, setBrewing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    void say([LINES.cauldron, LINES.makeThis, rounds[0].target]);
    return () => stopVoice();
  }, [rounds]);

  const stir = () => {
    if (!cho || !jung || brewing || g.right) return;
    setBrewing(true);
    setResult(null);
    sfx.cheer();
    g.later(() => {
      setBrewing(false);
      const made = makeSyllable(cho, jung);
      setResult(made);
      if (made === r.target) {
        g.win([made], () => {
          setCho(null);
          setJung(null);
          setResult(null);
          void say([LINES.makeThis, rounds[g.idx + 1].target]);
        });
        return;
      }
      g.miss();
      void say([LINES.made, made, pick(LINES.retry), r.target]);
    }, 1100);
  };

  const shelf = (items: string[], kind: "cho" | "jung") => (
    <div className="flex gap-3">
      {items.map((c, i) => {
        const on = (kind === "cho" ? cho : jung) === c;
        return (
          <button
            key={`${g.idx}-${c}`}
            type="button"
            onClick={() => {
              if (g.right || brewing) return;
              sfx.pop();
              setResult(null);
              if (kind === "cho") setCho(c);
              else setJung(c);
            }}
            className={`relative grid h-[min(16vh,calc(11*var(--vw)))] w-[min(12vh,calc(8.5*var(--vw)))] place-items-center rounded-b-[1.6rem] rounded-t-[0.8rem] ${on ? "-translate-y-3 ring-4 ring-ink" : ""} ${
              g.misses >= 2 && (c === decompose(r.target)?.cho || c === decompose(r.target)?.jung) ? "animate-breathe" : ""
            }`}
            style={{ background: `var(--${toneAt(i + (kind === "cho" ? 0 : 3))})` }}
          >
            <span className="absolute -top-3 h-4 w-1/2 rounded-t bg-ink/30" />
            <Glyph char={c} style={{ fontSize: "min(8vh, calc(5.5*var(--vw)))" }} />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-full items-center justify-center gap-10 px-6 pb-6 portrait:flex-col portrait:gap-4 portrait:px-3">
      <div className="flex flex-col items-center gap-6 portrait:gap-3">
        <SpeakerButton text={r.target} size={96} pulse />
        {shelf(r.consonants, "cho")}
        {shelf(r.vowels, "jung")}
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-24 items-end gap-2 text-[min(9vh,calc(6*var(--vw)))]">
          {result ? (
            <span className={`animate-pop-in font-letter font-bold ${g.right ? "text-mint-deep" : "text-ink"}`}>{result}</span>
          ) : (
            <>
              {cho && <Glyph char={cho} className="animate-float" />}
              {jung && <Glyph char={jung} className="animate-float [animation-delay:0.4s]" />}
            </>
          )}
        </div>
        <button type="button" onClick={stir} aria-label="저어요" className={`relative ${brewing ? "animate-wiggle" : ""}`}>
          {/* 솥 — 이모지(🫕)는 오래된 기기에서 네모로 깨져서 직접 그린다 */}
          <svg viewBox="0 0 120 100" className="h-[min(30vh,calc(20*var(--vw)))] w-[min(36vh,calc(24*var(--vw)))]" aria-hidden>
            <ellipse cx="60" cy="30" rx="50" ry="12" fill={brewing ? "#7ee2b8" : "#a9e9cd"} />
            <path d="M12 32 Q14 88 60 90 Q106 88 108 32 Q60 46 12 32 Z" fill="#4a4560" />
            <ellipse cx="60" cy="30" rx="50" ry="12" fill="none" stroke="#3e3a52" strokeWidth="5" />
            <path d="M28 88 L22 98 M92 88 L98 98" stroke="#3e3a52" strokeWidth="6" strokeLinecap="round" />
            <circle cx="42" cy="26" r="5" fill="#fff" opacity="0.7" />
            <circle cx="70" cy="31" r="3.5" fill="#fff" opacity="0.7" />
          </svg>
          {brewing && <span className="absolute inset-x-0 -top-6 animate-float text-[min(8vh,calc(5*var(--vw)))]"><Icon emoji="✨" /></span>}
        </button>
        <SquishButton tone="lilac" className="whitespace-nowrap rounded-full px-8 py-3 text-3xl" disabled={!cho || !jung || brewing} onClick={stir}>
          휘휘 저어요
        </SquishButton>
      </div>
    </div>
  );
}

/** 손글씨 낱말 카드 — 그림 낱말을 따라 쓰면 카드가 모인다 */
export function WordCardGame({ items, onDone }: { items: string[]; onDone: OnDone }) {
  const [idx, setIdx] = useState(0);
  const [cards, setCards] = useState<string[]>([]);
  const [k, erase] = useBoardKey();
  const later = useTimers();
  const word = items[idx];

  useEffect(() => {
    void say([LINES.wordCard, items[0]]);
    return () => stopVoice();
  }, [items]);

  return (
    <div className="flex h-full flex-col items-center justify-evenly px-6 pb-4">
      <div className="flex items-center gap-5">
        <Picture item={word} size="min(18vh, calc(13*var(--vw)))" />
        <SpeakerButton text={word} size={80} />
        <SquishButton
          tone="butter"
          className="rounded-full px-6 py-3 text-2xl"
          onClick={() => {
            sfx.tick();
            erase();
          }}
        >
          지우기
        </SquishButton>
      </div>
      <TraceBoard
        key={`${idx}-${k}`}
        text={word}
        aspect={Math.max(1.6, [...word].length * 1.05)}
        width={boardWidth(Math.max(1.6, [...word].length * 1.05), [...word].length > 2 ? 86 : 64, 22)}
        onSuccess={() => {
          sfx.cheer();
          setCards((c) => [...c, word]);
          void say([word, pick(LINES.praise)]);
          later(() => {
            if (idx + 1 >= items.length) {
              onDone({ correct: 0, total: 0 });
              return;
            }
            setIdx(idx + 1);
            void say(items[idx + 1]);
          }, 1600);
        }}
      />
      <div className="flex min-h-24 gap-3">
        {cards.map((c) => (
          <div key={c} className="flex animate-pop-in flex-col items-center rounded-2xl bg-card px-3 py-2 shadow-[0_5px_0_var(--paper-deep)]">
            <Picture item={c} size="44px" />
            <span className="font-letter text-xl font-bold">{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
