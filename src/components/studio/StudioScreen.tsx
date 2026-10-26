"use client";

import { useEffect, useState } from "react";
import { Glyph, Picture } from "@/components/Art";
import { FireflyIcon } from "@/components/FireflyIcon";
import { Icon } from "@/components/Icon";
import { ModeShell } from "@/components/ModeShell";
import { boardWidth, TraceBoard } from "@/components/TraceBoard";
import { MenuCard, Splash, SquishButton, toneAt } from "@/components/ui";
import { CHILD, NAME_SYLLABLES } from "@/curriculum/child";
import { atLeast, learnedAt, PREVIEW } from "@/curriculum/learned";
import { LINES } from "@/curriculum/lines";
import { menuOf } from "@/curriculum/menus";
import { STUDIO, type StudioId } from "@/curriculum/modes";
import { useIsMaster } from "@/lib/auth";
import { usePortrait } from "@/lib/orientation";
import { recordPlay } from "@/lib/play";
import { sfx } from "@/lib/sfx";
import { useSaved } from "@/lib/store";
import { useTimers } from "@/lib/useTimers";
import { pick, say, stopVoice } from "@/lib/voice";
import { ColorPad } from "./ColorPad";
import { DrawPad } from "./DrawPad";
import { CARD_TEMPLATES, COLORING_PAGES, PRACTICE_SENTENCES, STICKERS } from "./pages";

/** 고르는 칩 줄 — 색칠 그림·글자·낱말·카드 고르기. 세로 화면에서는 한 줄로 옆으로 밀어서 본다 */
function Chips<T extends string>({ items, value, onPick, label }: { items: T[]; value: T; onPick: (v: T) => void; label: (v: T) => string }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 portrait:w-full portrait:flex-nowrap portrait:justify-start portrait:overflow-x-auto portrait:px-1 portrait:py-1">
      {items.map((it, i) => (
        <button
          key={it}
          type="button"
          onClick={() => {
            sfx.tick();
            onPick(it);
          }}
          className={`shrink-0 rounded-full px-5 py-2 text-2xl ${value === it ? "ring-4 ring-ink" : ""}`}
          style={{ background: `var(--${toneAt(i)})` }}
        >
          {label(it)}
        </button>
      ))}
    </div>
  );
}

/** 내 이름 쓰기 — 이하온 · 이 · 하 · 온 (2026-10-26 사용자 요청: 글자 쓰기에 「내 이름을 써 봐요」) */
const MY_NAME: string[] = [CHILD.full, ...NAME_SYLLABLES];

/** 낱말·문장 쓰기 연습 — 다 쓰면 칭찬하고 다음 것으로. names 가 있으면 맨 앞에 「내 이름」 */
function WritingPractice({ items, sentence, names = [] }: { items: string[]; sentence: boolean; names?: string[] }) {
  const all = [...names, ...items];
  const [idx, setIdx] = useState(0);
  const [round, setRound] = useState(0);
  const later = useTimers();
  const text = all[idx % all.length];
  const isName = names.includes(text);
  useEffect(() => {
    // 이름 전체를 쓸 때는 페파가 먼저 "하온아, 네 이름을 써 볼까?"
    void say(text === CHILD.full ? [LINES.myName, text] : text);
  }, [text]);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 pb-4">
      {names.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-[2rem] bg-rose/70 px-3 py-2">
          <span className="px-1 text-xl">
            <Icon emoji="👑" /> 내 이름
          </span>
          {names.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                sfx.tick();
                setIdx(all.indexOf(n));
              }}
              className={`rounded-full bg-card px-5 py-2 font-letter text-2xl font-bold ${text === n ? "ring-4 ring-ink" : ""}`}
            >
              {n}
            </button>
          ))}
        </div>
      )}
      <Chips items={items} value={text} onPick={(v) => setIdx(all.indexOf(v))} label={(v) => v} />
      <div className="flex items-center gap-4">
        {isName ? (
          <span className="animate-pop-in rounded-full bg-rose px-6 py-2 text-3xl shadow-[0_5px_0_var(--rose-deep)]">
            <Icon emoji="👑" /> 내 이름을 써 봐요!
          </span>
        ) : (
          !sentence && <Picture item={text} size="min(16vh, 12vw)" />
        )}
      </div>
      <TraceBoard
        key={`${text}-${round}`}
        text={text}
        aspect={Math.min(4.6, Math.max(1.6, [...text].length * 1.05))}
        width={boardWidth(Math.min(4.6, Math.max(1.6, [...text].length * 1.05)), 94, 20)}
        onSuccess={() => {
          sfx.cheer();
          recordPlay({ acts: 1 });
          void say(pick(LINES.praise));
          later(() => {
            setRound((r) => r + 1);
            setIdx((i) => i + 1);
          }, 1600);
        }}
      />
    </div>
  );
}

export default function StudioScreen() {
  const saved = useSaved();
  const master = useIsMaster();
  const [open, setOpen] = useState<StudioId | null>(null);
  const [page, setPage] = useState(COLORING_PAGES[0].id);
  const [letter, setLetter] = useState<string | null>(null);
  const [card, setCard] = useState(CARD_TEMPLATES[0].id);
  // 세로 화면에서는 그리기·색칠 판도 세로로 길게(4:5) — 폰을 세워 들면 판이 커진다
  const portrait = usePortrait();
  const padAspect = portrait ? 0.8 : 4 / 3;

  useEffect(() => {
    void say(LINES.studio);
    return () => stopVoice();
  }, []);

  if (!saved) return <Splash />;
  const fire = saved.progress.fireflies;
  const all = master;
  const learned = learnedAt(saved.progress.unit, saved.progress.day);
  const letters = atLeast([...learned.consonants, ...learned.vowels], [...PREVIEW.consonants, ...PREVIEW.vowels], 4);
  const words = atLeast(learned.words, PREVIEW.words, 3);
  const item = STUDIO.find((s) => s.id === open);

  if (!item) {
    return (
      <ModeShell title={menuOf("studio").title} icon="🎨" iconId="menu:studio" scene="studio">
        <div className="mx-auto grid h-full max-w-6xl grid-cols-3 content-center gap-5 px-10 pb-6 portrait:grid-cols-2 portrait:gap-3 portrait:px-4 short:gap-3 short:pb-3">
          {STUDIO.map((s, i) => {
            const unlocked = all || fire >= s.need;
            return (
              <MenuCard
                key={s.id}
                tone={toneAt(i)}
                locked={!unlocked}
                lockText={
                  <span className="inline-flex items-center gap-1">
                    <FireflyIcon size={16} /> {fire}/{s.need}
                  </span>
                }
                title={<span className="text-2xl portrait:text-xl short:text-lg">{s.title}</span>}
                className="animate-pop-in"
                style={{ animationDelay: `${i * 60}ms` }}
                artClassName="aspect-[16/10] flex-none"
                art={<Icon id={`studio:${s.id}`} emoji={s.icon} className="text-[6.5rem] short:text-[3.4rem] portrait:text-[4.8rem]" />}
                onClick={() => {
                  sfx.wake();
                  if (!unlocked) {
                    sfx.boop();
                    void say(LINES.studioLocked);
                    return;
                  }
                  sfx.pop();
                  setOpen(s.id);
                }}
              />
            );
          })}
        </div>
      </ModeShell>
    );
  }

  const back = () => setOpen(null);
  // 판 크기 — 화면 높이에 맞춘다. 폰 가로에서는 도구가 판 옆으로 가서 판을 더 크게(--pad)
  const padWidth = "var(--pad)";

  return (
    <ModeShell title={item.title} icon={item.icon} iconId={`studio:${item.id}`} scene="studio" onBack={back}>
      <div className="h-full overflow-y-auto px-4 pb-4 [--pad:min(74vw,calc((100dvh-22rem)*1.333))] [--pad-sq:min(64vw,calc((100dvh-22rem)*1.25))] short:[--pad-sq:min(56vw,calc((100dvh-9rem)*1.25))] short:[--pad:min(56vw,calc((100dvh-9rem)*1.333))] portrait:[--pad:min(94vw,calc((100dvh-31rem)*0.8))] portrait:[--pad-sq:min(94vw,calc((100dvh-22rem)*1.25))]">
      <div className="flex min-h-full flex-col items-center justify-center gap-3">
        {item.id === "draw" && <DrawPad name="그림" width={padWidth} aspect={padAspect} />}

        {item.id === "color" && (
          <>
            <Chips items={COLORING_PAGES.map((p) => p.id)} value={page} onPick={setPage} label={(v) => COLORING_PAGES.find((p) => p.id === v)?.title ?? v} />
            <ColorPad key={page} source={(COLORING_PAGES.find((p) => p.id === page) ?? COLORING_PAGES[0]).source} name="색칠" width={padWidth} aspect={padAspect} />
          </>
        )}

        {item.id === "letter-color" && (
          <>
            <div className="flex flex-wrap justify-center gap-2 portrait:w-full portrait:flex-nowrap portrait:justify-start portrait:overflow-x-auto portrait:px-1 portrait:py-1">
              {letters.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    sfx.tick();
                    setLetter(l);
                  }}
                  className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-card ${(letter ?? letters[0]) === l ? "ring-4 ring-ink" : ""}`}
                >
                  <Glyph char={l} className="text-3xl" />
                </button>
              ))}
            </div>
            <ColorPad key={letter ?? letters[0]} source={{ kind: "glyph", text: letter ?? letters[0] }} name="글자색칠" width="var(--pad-sq)" aspect={1.25} />
          </>
        )}

        {item.id === "word-write" && <WritingPractice items={words} sentence={false} names={MY_NAME} />}
        {item.id === "sentence-write" && <WritingPractice items={PRACTICE_SENTENCES} sentence />}

        {item.id === "card" && (
          <>
            <div className="flex gap-3">
              {CARD_TEMPLATES.map((t) => (
                <SquishButton key={t.id} tone={card === t.id ? "peach" : "card"} className="rounded-full px-5 py-2 text-2xl" onClick={() => setCard(t.id)}>
                  {t.emoji} {t.message}
                </SquishButton>
              ))}
            </div>
            <DrawPad key={card} name="카드" card={CARD_TEMPLATES.find((t) => t.id === card)} stickers={STICKERS} width={padWidth} aspect={padAspect} />
          </>
        )}
      </div>
      </div>
    </ModeShell>
  );
}
