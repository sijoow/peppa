"use client";

import { useEffect, useRef, useState } from "react";
import { Glyph, Picture } from "@/components/Art";
import { Icon } from "@/components/Icon";
import { DoneBurst, ModeShell } from "@/components/ModeShell";
import { MenuCard, SpeakerButton, Splash, SquishButton, useCompact } from "@/components/ui";
import { galaxyQuestion, KEYBOARD, type GalaxyQuestion } from "@/curriculum/galaxyContent";
import { compose } from "@/curriculum/hangul";
import { isLetter } from "@/curriculum/items";
import { learnedAt, type Learned } from "@/curriculum/learned";
import { LINES } from "@/curriculum/lines";
import { menuOf } from "@/curriculum/menus";
import { GALAXIES, GALAXY_STAGES, stageRule, type Galaxy } from "@/curriculum/modes";
import { imageOf } from "@/lib/assets";
import { useIsMaster } from "@/lib/auth";
import { isOpen } from "@/lib/play";
import { finishGalaxyStage, galaxyPlaysLeft, GALAXY_PLAYS_PER_DAY, localDay, startGalaxyPlay } from "@/lib/progress";
import { seededRng, type Rng } from "@/lib/rounds";
import { sfx } from "@/lib/sfx";
import { readSaved, updateSaved, useSaved, useToday } from "@/lib/store";
import { say, stopVoice } from "@/lib/voice";

/** 페파풍 밤하늘 그림이 있으면 그 그림, 없으면 직접 그린 별 하늘 */
const NIGHT = imageOf("bg:galaxy");

/*
 * 은하계 여행 — 토도한글 도전 과제. 은하마다 행성 5개, 60초 안에 목숨 3개로 목표 개수를 맞히면 다음 행성.
 * 하루 5번(다음 날 다시 채워진다). 마스터 아이디는 제한 없음.
 */

const SKY = "radial-gradient(circle at 20% 15%, #6b5fc7 0, transparent 40%), radial-gradient(circle at 80% 80%, #3f7fc4 0, transparent 45%), #2c2a5a";

function freshRng(): Rng {
  return seededRng(Date.now());
}

/** 지금 시각(ms) — 누를 때·타이머에서만 부른다 */
function nowMs(): number {
  return performance.now();
}

function Stars() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(#fff 1.2px, transparent 1.5px), radial-gradient(#ffe08f 1px, transparent 1.3px)", backgroundSize: "70px 70px, 110px 110px", backgroundPosition: "0 0, 35px 50px" }} />
  );
}

/** 한 판 — 60초, 목숨 3개, 목표 개수 */
function Run({ galaxy, stage, learned, onEnd }: { galaxy: Galaxy; stage: number; learned: Learned; onEnd: (cleared: boolean, ms: number) => void }) {
  const rule = stageRule(stage);
  const rng = useRef<Rng | null>(null);
  const started = useRef(0);
  const overRef = useRef(false);
  const scoreRef = useRef(0);
  const onEndRef = useRef(onEnd);
  const [playing, setPlaying] = useState(false);
  const [q, setQ] = useState<GalaxyQuestion | null>(null);
  const [left, setLeft] = useState(rule.seconds);
  const [lives, setLives] = useState(rule.lives);
  const [score, setScore] = useState(0);
  const [typed, setTyped] = useState<string[]>([]);
  const [shake, setShake] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  const ask = (next: GalaxyQuestion) => {
    setQ(next);
    setTyped([]);
    if (next.say.length) void say(next.say);
  };

  const begin = () => {
    sfx.wake();
    rng.current = freshRng();
    started.current = nowMs();
    setPlaying(true);
    ask(galaxyQuestion(galaxy, stage, learned, rng.current));
  };

  const end = (cleared: boolean) => {
    if (overRef.current) return;
    overRef.current = true;
    setOver(true);
    stopVoice();
    onEndRef.current(cleared, nowMs() - started.current);
  };

  // 남은 시간 — 다 되면 그때까지 맞힌 수로 끝낸다
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const t = rule.seconds - Math.floor((nowMs() - started.current) / 1000);
      setLeft(Math.max(0, t));
      if (t <= 0 && !overRef.current) {
        overRef.current = true;
        setOver(true);
        stopVoice();
        onEndRef.current(scoreRef.current >= rule.goal, nowMs() - started.current);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [playing, rule.seconds, rule.goal]);

  const right = () => {
    sfx.ding();
    const s = score + 1;
    scoreRef.current = s;
    setScore(s);
    if (s >= rule.goal) {
      end(true);
      return;
    }
    if (rng.current) ask(galaxyQuestion(galaxy, stage, learned, rng.current));
  };

  const wrong = (key: string) => {
    sfx.boop();
    setShake(key);
    window.setTimeout(() => setShake(null), 400);
    const l = lives - 1;
    setLives(l);
    if (l <= 0) end(false);
  };

  const pick = (c: string) => {
    if (!q || over) return;
    if (c === q.answer) right();
    else wrong(c);
  };

  const press = (k: string) => {
    if (!q?.keys || over) return;
    const want = q.keys[typed.length];
    if (k !== want) {
      wrong(k);
      return;
    }
    sfx.tick();
    const t = [...typed, k];
    setTyped(t);
    if (t.length === q.keys.length) right();
  };

  if (!q) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center gap-6 text-white">
        <p className="text-5xl">
          <Icon id={`galaxy:${galaxy.id}`} emoji={galaxy.icon} /> {galaxy.title} · 행성 {stage}
        </p>
        <p className="font-body text-2xl">
          {rule.seconds}초 안에 {rule.goal}개! 목숨은 {Array.from({ length: rule.lives }, (_, i) => <Icon key={i} emoji="❤️" />)}
        </p>
        <SquishButton tone="butter" className="rounded-full px-16 py-5 text-5xl" onClick={begin}>
          <Icon emoji="🚀" /> 출발!
        </SquishButton>
      </div>
    );
  }

  const typedPreview = q.keys && q.keys.length === 2 && typed.length === 1 ? typed[0] : typed.length === 2 ? (compose(typed[0], typed[1]) ?? "") : typed.join("");

  return (
    <div className="relative flex h-full flex-col items-center justify-between px-6 pb-4 text-white">
      <div className="flex w-full max-w-5xl items-center justify-between text-3xl">
        <span>{Array.from({ length: Math.max(0, lives) }, (_, i) => <Icon key={i} emoji="❤️" />)}</span>
        <span>
          <Icon emoji="⭐" /> {score} / {rule.goal}
        </span>
        <span className={left <= 10 ? "text-peach" : ""}><Icon emoji="⏱️" /> {left}</span>
      </div>

      <div key={`${score}-${q.answer}`} className="flex animate-pop-in items-center gap-5">
        {q.show?.kind === "picture" && (
          <div className="rounded-[2.5rem] bg-white/90 p-4">
            <Picture item={q.show.value} size="min(20vh, calc(15*var(--vw)))" />
          </div>
        )}
        {q.show?.kind === "text" && (
          <div className="rounded-[2.5rem] bg-white/90 px-10 py-4 text-ink">
            {isLetter(q.show.value) ? <Glyph char={q.show.value} style={{ fontSize: "min(16vh, calc(12*var(--vw)))" }} /> : <span className="font-letter font-bold" style={{ fontSize: "min(11vh, calc(8*var(--vw)))" }}>{q.show.value}</span>}
          </div>
        )}
        {q.say.length > 0 && <SpeakerButton text={q.say} size={96} pulse />}
        {q.keys && q.keys.length > 1 && (
          <div className="grid h-[min(16vh,calc(12*var(--vw)))] w-[min(16vh,calc(12*var(--vw)))] place-items-center rounded-[2rem] border-4 border-dashed border-white/60 font-letter text-[min(10vh,calc(7*var(--vw)))] font-bold">{typedPreview}</div>
        )}
      </div>

      {q.keys ? (
        <div className="flex flex-col items-center gap-2">
          {KEYBOARD.map((row, ri) => (
            <div key={ri} className="flex gap-2" style={{ marginLeft: ri * 28 }}>
              {row.map((k) => {
                const vowel = /[ㅏ-ㅣ]/.test(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    className={`grid h-[min(10vh,calc(7*var(--vw)))] w-[min(10vh,calc(7*var(--vw)))] place-items-center rounded-2xl font-letter text-[min(5.5vh,calc(4*var(--vw)))] font-bold text-ink shadow-[0_5px_0_rgb(0_0_0/0.25)] active:translate-y-1 ${
                      shake === k ? "animate-shake bg-peach" : vowel ? "bg-rose" : "bg-sky"
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex max-w-6xl flex-wrap justify-center gap-4 pb-4">
          {q.choices.map((c, i) => (
            <button
              key={`${score}-${c}`}
              type="button"
              onClick={() => pick(c)}
              className={`grid min-w-[min(15vh,calc(11*var(--vw)))] place-items-center rounded-full px-5 py-3 text-ink shadow-[0_8px_0_rgb(0_0_0/0.25)] ${shake === c ? "animate-shake bg-peach" : "bg-white/90"} animate-float`}
              style={{ animationDelay: `${(i % 5) * 0.3}s`, height: "min(15vh, calc(11*var(--vw)))" }}
            >
              {isLetter(c) ? <Glyph char={c} style={{ fontSize: "min(9vh, calc(6.5*var(--vw)))" }} /> : <span className="font-letter font-bold" style={{ fontSize: "min(5.5vh, calc(4*var(--vw)))" }}>{c}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GalaxyScreen() {
  const saved = useSaved();
  const master = useIsMaster();
  const today = useToday();
  const compact = useCompact();
  const [gid, setGid] = useState<string | null>(null);
  const [stage, setStage] = useState<number | null>(null);
  const [result, setResult] = useState<{ cleared: boolean; earned: number } | null>(null);
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    void say(LINES.galaxy);
    return () => stopVoice();
  }, []);

  if (!saved) return <Splash />;
  const galaxy = GALAXIES.find((g) => g.id === gid);
  const plays = master ? GALAXY_PLAYS_PER_DAY : galaxyPlaysLeft(saved.progress, today);
  const learned = learnedAt(saved.progress.unit, saved.progress.day);
  const k = compact ? 0.6 : 1;
  const sky = (
    <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: SKY }}>
      <Stars />
    </div>
  );

  const start = (s: number) => {
    sfx.wake();
    if (!master) {
      const next = startGalaxyPlay(readSaved().progress, localDay(new Date()));
      if (!next) {
        sfx.boop();
        void say(LINES.galaxyTired);
        return;
      }
      updateSaved((v) => ({ ...v, progress: next }));
    }
    sfx.pop();
    setResult(null);
    setStage(s);
    setRunKey((k) => k + 1);
  };

  if (galaxy && stage) {
    return (
      <ModeShell title={galaxy.title} icon={galaxy.icon} iconId={`galaxy:${galaxy.id}`} onBack={() => setStage(null)} scene="galaxy" backdrop={NIGHT ? undefined : sky}>
        <div className="absolute inset-0">
          <Run
            key={runKey}
            galaxy={galaxy}
            stage={stage}
            learned={learned}
            onEnd={(cleared, ms) => {
              const r = finishGalaxyStage(readSaved().progress, galaxy.id, stage, cleared, Math.round(ms), localDay(new Date()));
              updateSaved((v) => ({ ...v, progress: r.next }));
              if (cleared) sfx.cheer();
              void say(cleared ? LINES.galaxyClear : LINES.galaxyFail);
              setResult({ cleared, earned: r.earned });
            }}
          />
        </div>
        {result && (
          <DoneBurst
            earned={result.earned}
            text={result.cleared ? `행성 ${stage} 통과!` : "아쉬워! 다시 도전!"}
            nextLabel="행성 지도로"
            onNext={() => {
              setResult(null);
              setStage(null);
            }}
          />
        )}
      </ModeShell>
    );
  }

  if (galaxy) {
    const cleared = saved.progress.galaxy.cleared[galaxy.id] ?? 0;
    return (
      <ModeShell title={galaxy.title} icon={galaxy.icon} iconId={`galaxy:${galaxy.id}`} onBack={() => setGid(null)} scene="galaxy" backdrop={NIGHT ? undefined : sky}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8">
          <div className="relative flex items-end gap-6">
            {Array.from({ length: GALAXY_STAGES }, (_, i) => {
              const s = i + 1;
              const open = master || s <= cleared + 1;
              const done = s <= cleared;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!open}
                  onClick={() => start(s)}
                  className={`relative grid place-items-center rounded-full text-4xl text-ink shadow-[0_10px_0_rgb(0_0_0/0.25)] ${open ? "animate-float" : "opacity-40"}`}
                  style={{
                    width: (96 + i * 14) * k,
                    height: (96 + i * 14) * k,
                    marginBottom: (i % 2) * 60 * k,
                    background: done ? "radial-gradient(circle at 30% 30%, #fff6a8, #eeb43c)" : `radial-gradient(circle at 30% 30%, #fff, var(--${["sky", "lilac", "mint", "rose", "peach"][i]}))`,
                    animationDelay: `${i * 0.4}s`,
                  }}
                >
                  {done ? <Icon emoji="⭐" /> : open ? s : <Icon emoji="🔒" />}
                </button>
              );
            })}
          </div>
          <p className="relative rounded-full bg-white/85 px-6 py-2 text-2xl text-ink">
            오늘 남은 여행 {master ? "무제한(마스터)" : `${plays} / ${GALAXY_PLAYS_PER_DAY}`} · 통과한 행성 {cleared} / {GALAXY_STAGES}
          </p>
        </div>
      </ModeShell>
    );
  }

  return (
    <ModeShell title={menuOf("galaxy").title} icon="🚀" iconId="menu:galaxy" scene="galaxy" backdrop={NIGHT ? undefined : sky}>
      <div className="scroll-fade absolute inset-0 flex flex-col items-center justify-center-safe gap-6 overflow-y-auto px-10 py-4 short:gap-3 short:py-2 portrait:gap-4 portrait:px-4">
        <p className="glass relative rounded-full px-6 py-2 text-xl font-extrabold text-ink portrait:px-4 portrait:text-base">
          <Icon emoji="🚀" /> 오늘 남은 여행 {master ? "무제한(마스터)" : `${plays} / ${GALAXY_PLAYS_PER_DAY}`}
        </p>
        <div className="relative grid w-full max-w-4xl grid-cols-3 gap-4 short:max-w-none short:grid-cols-6 short:gap-2.5 portrait:grid-cols-2 portrait:gap-3">
          {GALAXIES.map((g, i) => {
            const unlocked = isOpen(saved, g.opens, master);
            const cleared = saved.progress.galaxy.cleared[g.id] ?? 0;
            return (
              <MenuCard
                key={g.id}
                tone="card"
                dark
                locked={!unlocked}
                lockText={`${g.opens.unit}단원부터`}
                title={<span className="text-xl portrait:text-lg">{g.title}</span>}
                sub={
                  unlocked && (
                    <span className="inline-flex gap-0.5 text-base">
                      {Array.from({ length: GALAXY_STAGES }, (_, k) => (
                        <Icon key={k} emoji="⭐" className={k < cleared ? "" : "opacity-25 grayscale"} />
                      ))}
                    </span>
                  )
                }
                className="animate-pop-in"
                style={{ animationDelay: `${i * 60}ms` }}
                artClassName="aspect-[16/10] flex-none"
                art={<Icon id={`galaxy:${g.id}`} emoji={g.icon} className="text-[5rem] short:text-[3.4rem] portrait:text-[4rem]" />}
                onClick={() => {
                  sfx.wake();
                  if (!unlocked) {
                    sfx.boop();
                    void say(LINES.locked);
                    return;
                  }
                  sfx.pop();
                  setGid(g.id);
                }}
              />
            );
          })}
        </div>
      </div>
    </ModeShell>
  );
}
