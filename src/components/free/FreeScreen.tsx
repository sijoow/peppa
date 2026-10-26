"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { DoneBurst, ModeShell } from "@/components/ModeShell";
import { ChoiceRounds } from "@/components/play/activities/ChoiceRounds";
import { Trace } from "@/components/play/activities/Trace";
import type { ActivityResult } from "@/components/play/types";
import { MenuCard, PlayIcon, Splash, type Tone } from "@/components/ui";
import { buildFreeGame, type FreeBuilt } from "@/curriculum/freeContent";
import { learnedAt } from "@/curriculum/learned";
import { LINES } from "@/curriculum/lines";
import { menuOf } from "@/curriculum/menus";
import { FREE_AREAS, FREE_GAMES, type FreeArea, type FreeGame } from "@/curriculum/modes";
import { imageOf } from "@/lib/assets";
import { useIsMaster } from "@/lib/auth";
import { isOpen, recordPlay } from "@/lib/play";
import { FIREFLY_FREE } from "@/lib/progress";
import { seededRng } from "@/lib/rounds";
import { sfx } from "@/lib/sfx";
import { readSaved, useSaved } from "@/lib/store";
import { say, stopVoice } from "@/lib/voice";
import { AssembleGame, CauldronGame, PiecesGame, WheelGame, WordCardGame } from "./BuildGames";
import { MineGame, ReadGame, SoccerGame, StationGame } from "./PickGames";
import { RhythmGame } from "./RhythmGame";

/** 판을 새로 섞을 씨앗 — 누를 때만 부른다 */
function freshSeed(): number {
  return Date.now();
}

function GameHost({ built, onDone }: { built: FreeBuilt; onDone: (r: ActivityResult) => void }) {
  switch (built.kind) {
    case "pick":
      if (built.skin === "mine") return <MineGame rounds={built.rounds} onDone={onDone} />;
      if (built.skin === "station") return <StationGame rounds={built.rounds} onDone={onDone} />;
      return <SoccerGame rounds={built.rounds} onDone={onDone} />;
    case "listen":
      return <ChoiceRounds rounds={built.rounds} variant="listen" assess={false} onDone={onDone} />;
    case "trace":
      return <Trace items={built.items} mode={built.mode} onDone={onDone} />;
    case "word-card":
      return <WordCardGame items={built.items} onDone={onDone} />;
    case "pieces":
      return <PiecesGame rounds={built.rounds} onDone={onDone} />;
    case "wheel":
      return <WheelGame rounds={built.rounds} onDone={onDone} />;
    case "assemble":
      return <AssembleGame rounds={built.rounds} onDone={onDone} />;
    case "cauldron":
      return <CauldronGame rounds={built.rounds} onDone={onDone} />;
    case "rhythm":
      return <RhythmGame notes={built.notes} onDone={onDone} />;
    case "read":
      return <ReadGame skin={built.skin} rounds={built.rounds} onDone={onDone} />;
  }
}

/** 자유 모드 — 토도한글 5영역 15종. 진도에 따라 하나씩 열린다(부모 '모든 메뉴 열기'면 다) */
export default function FreeScreen() {
  const saved = useSaved();
  const master = useIsMaster();
  const [play, setPlay] = useState<{ game: FreeGame; built: FreeBuilt; key: number } | null>(null);
  const [done, setDone] = useState(false);
  const [tab, setTab] = useState<FreeArea | null>(null);

  useEffect(() => {
    void say(LINES.free);
    return () => stopVoice();
  }, []);

  if (!saved) return <Splash />;

  const open = (game: FreeGame) => {
    sfx.wake();
    if (!isOpen(saved, game.opens, master)) {
      sfx.boop();
      void say(LINES.locked);
      return;
    }
    sfx.pop();
    const { unit, day } = readSaved().progress;
    setDone(false);
    const seed = freshSeed();
    setPlay({ game, built: buildFreeGame(game.id, learnedAt(unit, day), seededRng(seed)), key: seed });
  };

  if (play) {
    return (
      <ModeShell title={play.game.title} icon={play.game.icon} iconId={`free:${play.game.id}`} scene="free" onBack={() => setPlay(null)}>
        <GameHost
          key={play.key}
          built={play.built}
          onDone={() => {
            recordPlay({ acts: 1, earned: FIREFLY_FREE });
            sfx.cheer();
            void say([LINES.sessionEnd, LINES.fireflies]);
            setDone(true);
          }}
        />
        {done && <DoneBurst earned={FIREFLY_FREE} text="놀이 끝! 잘했어!" nextLabel="또 할래!" onNext={() => open(play.game)} />}
      </ModeShell>
    );
  }

  // 고른 묶음 — 처음엔 열린 놀이가 있는 첫 묶음
  const firstOpen = FREE_AREAS.find((a) => FREE_GAMES.some((g) => g.area === a.id && isOpen(saved, g.opens, master)))?.id ?? FREE_AREAS[0].id;
  const current = FREE_AREAS.find((a) => a.id === (tab ?? firstOpen)) ?? FREE_AREAS[0];
  const games = FREE_GAMES.filter((g) => g.area === current.id);

  return (
    <ModeShell title={menuOf("free").title} icon="🎮" iconId="menu:free" scene="free">
      {/* 위: 묶음 탭 다섯 개 · 아래: 그 묶음의 놀이 세 개를 큰 장면 카드로 (2026-10-26 새 놀이터) */}
      <div className="flex h-full flex-col gap-4 overflow-y-auto px-6 pb-5 pt-1 short:gap-2 short:px-4 short:pb-2 portrait:gap-3 portrait:px-3">
        <div className="glass mx-auto flex max-w-full shrink-0 gap-1 overflow-x-auto rounded-full p-1.5 short:p-1 portrait:w-full portrait:overflow-visible portrait:rounded-[1.6rem]" role="tablist" aria-label="놀이 묶음">
          {FREE_AREAS.map((a) => {
            const on = a.id === current.id;
            const src = imageOf(AREA_GUIDE[a.id]);
            return (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  sfx.tick();
                  setTab(a.id);
                }}
                className={`flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1.5 pr-4 text-lg font-extrabold whitespace-nowrap transition-all short:text-base portrait:flex-1 portrait:flex-col portrait:gap-0.5 portrait:rounded-[1.2rem] portrait:px-0.5 portrait:py-1.5 portrait:text-[0.78rem] portrait:whitespace-normal portrait:break-keep ${
                  on ? "bg-white text-ink shadow-[0_6px_16px_-8px_rgb(62_58_82/0.5)]" : "text-ink-soft hover:bg-white/60"
                }`}
              >
                <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full short:h-8 short:w-8" style={{ background: `var(--${a.tone})` }}>
                  {src && <Image src={src} alt="" fill sizes="48px" className="object-contain object-top p-0.5" draggable={false} />}
                </span>
                {a.title}
              </button>
            );
          })}
        </div>

        <div key={current.id} className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-3 content-center gap-5 short:gap-3 portrait:grid-cols-2 portrait:gap-3">
          {games.map((g, i) => {
            const unlocked = isOpen(saved, g.opens, master);
            const scene = imageOf(`scene:free:${g.id}`);
            return (
              <MenuCard
                key={g.id}
                tone={current.tone as Tone}
                locked={!unlocked}
                lockText={`${g.opens.unit}단원${g.opens.day > 1 ? ` ${g.opens.day}일` : ""}부터`}
                title={<span className="text-2xl short:text-lg portrait:text-lg">{g.title}</span>}
                sub={<span className="line-clamp-2 break-keep short:hidden portrait:hidden">{g.desc}</span>}
                onClick={() => open(g)}
                className="animate-pop-in portrait:last:odd:col-span-2 portrait:last:odd:w-[calc(50%-0.4rem)] portrait:last:odd:justify-self-center"
                style={{ animationDelay: `${i * 70}ms` }}
                artClassName="aspect-square flex-none portrait:aspect-[4/5]"
                art={
                  scene ? (
                    <span className="relative block h-[min(30vh,calc(22*var(--vw)))] w-[min(30vh,calc(22*var(--vw)))] portrait:h-[42vw] portrait:w-[42vw]">
                      <Image src={scene} alt="" fill sizes="(orientation: portrait) 45vw, 25vw" className="object-contain" draggable={false} />
                    </span>
                  ) : (
                    <Icon id={`free:${g.id}`} emoji={g.icon} className="text-[min(18vh,calc(12*var(--vw)))] portrait:text-[5rem]" />
                  )
                }
              >
                {unlocked && (
                  <span className="absolute bottom-[4.2rem] right-4 grid h-11 w-11 place-items-center rounded-full bg-pink text-xl text-white shadow-[0_4px_0_var(--pink-deep)] short:bottom-[2.6rem] short:h-8 short:w-8 short:text-base portrait:bottom-[3.2rem] portrait:right-3 portrait:h-9 portrait:w-9 portrait:text-base">
                    <PlayIcon />
                  </span>
                )}
              </MenuCard>
            );
          })}
        </div>
      </div>
    </ModeShell>
  );
}

/** 묶음마다 안내하는 가족(페파풍 그림) — 탭 동그라미에 */
const AREA_GUIDE: Record<FreeArea, string> = { phonics: "mascot", writing: "엄마", compose: "아빠", spelling: "할머니", reading: "할아버지" };
