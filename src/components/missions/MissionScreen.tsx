"use client";

import { useEffect, useState } from "react";
import { Glyph, Picture } from "@/components/Art";
import { Icon } from "@/components/Icon";
import { DoneBurst, ModeShell } from "@/components/ModeShell";
import { ActivityHost } from "@/components/play/ActivityHost";
import { KIND_ICON, KIND_LABEL } from "@/components/play/kindIcon";
import { MenuCard, Splash, toneAt, type Tone } from "@/components/ui";
import { isLetter } from "@/curriculum/items";
import { LINES } from "@/curriculum/lines";
import { menuOf } from "@/curriculum/menus";
import { MISSION_GROUPS, MISSIONS, missionOf, type Mission } from "@/curriculum/missions";
import { imageOf } from "@/lib/assets";
import { completeMissionItem, localDay } from "@/lib/progress";
import { buildActivity, seededRng, type BuiltActivity } from "@/lib/rounds";
import { sfx } from "@/lib/sfx";
import { readSaved, updateSaved, useSaved } from "@/lib/store";
import { say, stopVoice } from "@/lib/voice";

/*
 * 도전 — 미션 88개를 배지 모으기로(2026-10-26 새 화면: 토도 목록 대신 우리 식).
 *   왼쪽(세로 화면은 위) 배지 판 + 묶음 · 오른쪽 그 묶음의 도전을 동그란 메달 카드로 — 받은 배지는 금빛.
 *   도전 안: 놀이 길(번호·이름·끝냄 표시) + 메달.
 * 처음부터 다 열려 있고, 도전 하나를 다 하면 배지.
 */

/** 묶음 이름은 아이 말로 — 데이터 이름(MISSION_GROUPS)은 그대로 둔다 */
const GROUP_LABEL: Record<string, string> = {
  "디지털 리터러시": "앱 익히기",
  "글자 이름": "글자 이름",
  "음운 인식": "소리 찾기",
  통글자: "낱말 보기",
  "기본 모음과 자음": "모음·자음",
  "기본 받침": "받침",
  "심화 자음": "어려운 자음",
  "심화 모음": "어려운 모음",
  "읽기 이해": "읽고 이해하기",
};
const labelOf = (g: string) => GROUP_LABEL[g] ?? g;

/** 도전 그림 — 그 도전의 첫 글자(ㄱ)나 첫 낱말 그림(사과), 없으면 놀이 아이콘 */
function MissionArt({ mission, size = "3.4rem" }: { mission: Mission; size?: string }) {
  const first = mission.items.flatMap((it) => ("items" in it.spec ? it.spec.items : []))[0];
  if (first && isLetter(first)) return <Glyph char={first} className="text-ink" style={{ fontSize: size }} />;
  if (first && imageOf(first)) return <Picture item={first} size={`calc(${size} * 1.3)`} />;
  return <Icon emoji={KIND_ICON[mission.items[0].spec.kind]} className="leading-none" />;
}

/** 메달 — 받은 배지는 금빛 테두리, 아직이면 묶음 색 */
function Medal({ mission, tone, earned, size }: { mission: Mission; tone: Tone; earned: boolean; size: string }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        fontSize: `calc(${size} * 0.42)`,
        background: earned ? "linear-gradient(145deg, #fff1a8, #f5c33b)" : `var(--${tone})`,
        boxShadow: earned ? "0 0 0 5px #fff6d0, 0 10px 22px -10px rgb(214 150 20 / 0.8)" : "0 0 0 5px rgb(255 255 255 / 0.9)",
      }}
    >
      <MissionArt mission={mission} size={`calc(${size} * 0.42)`} />
      {earned && (
        <span className="absolute -right-1.5 -top-1.5" style={{ fontSize: `calc(${size} * 0.36)` }}>
          <Icon id="mission:badge" emoji="🏅" />
        </span>
      )}
    </span>
  );
}

/** 판을 새로 섞을 씨앗 — 누를 때만 부른다 */
function freshSeed(): number {
  return Date.now();
}

export default function MissionScreen() {
  const saved = useSaved();
  const [open, setOpen] = useState<string | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [playing, setPlaying] = useState<{ index: number; built: BuiltActivity; key: number } | null>(null);
  const [burst, setBurst] = useState<{ earned: number; badge: boolean } | null>(null);

  useEffect(() => {
    void say(LINES.missions);
    return () => stopVoice();
  }, []);

  if (!saved) return <Splash />;
  const mission = open ? missionOf(open) : undefined;
  const stateOf = (id: string) => saved.progress.missions[id] ?? { done: [], badge: false };
  const badges = MISSIONS.filter((m) => stateOf(m.id).badge).length;
  const toneOfGroup = (g: string) => toneAt(Math.max(0, MISSION_GROUPS.indexOf(g)));

  if (mission && playing) {
    const item = mission.items[playing.index];
    return (
      <ModeShell title={mission.title} icon="🏅" iconId="mission:badge" scene="missions" onBack={() => setPlaying(null)}>
        <ActivityHost
          key={playing.key}
          built={playing.built}
          assess={Boolean(item.quiz)}
          onDone={() => {
            const r = completeMissionItem(readSaved().progress, mission.id, playing.index, mission.items.length, localDay(new Date()));
            updateSaved((s) => ({ ...s, progress: r.next }));
            sfx.cheer();
            void say(r.badgeNow ? [LINES.badge] : [LINES.sessionEnd]);
            setBurst({ earned: r.earned, badge: r.badgeNow });
          }}
        />
        {burst && (
          <DoneBurst
            earned={burst.earned}
            text={burst.badge ? "배지를 받았어!" : "잘했어!"}
            onNext={() => {
              setBurst(null);
              setPlaying(null);
            }}
          />
        )}
      </ModeShell>
    );
  }

  if (mission) {
    const st = stateOf(mission.id);
    const tone = toneOfGroup(mission.group);
    const next = mission.items.findIndex((_, i) => !st.done.includes(i));
    return (
      <ModeShell title={mission.title} icon={st.badge ? "🏅" : "🎯"} iconId={st.badge ? "mission:badge" : "mission:target"} scene="missions" onBack={() => setOpen(null)}>
        <div className="flex h-full items-center justify-center gap-8 overflow-y-auto px-8 pb-6 portrait:flex-col portrait:justify-start portrait:gap-4 portrait:px-4 portrait:pt-2 short:gap-5 short:pb-2">
          {/* 메달과 진행 */}
          <div className="glass flex shrink-0 flex-col items-center gap-3 rounded-[2rem] px-8 py-6 portrait:w-full portrait:flex-row portrait:gap-4 portrait:px-5 portrait:py-4 short:px-5 short:py-3">
            <Medal mission={mission} tone={tone} earned={st.badge} size="min(9rem, 30vw)" />
            <div className="flex flex-col items-center gap-1 portrait:items-start">
              <span className="rounded-full bg-white/80 px-3 py-0.5 text-sm font-extrabold text-ink-soft">
                {labelOf(mission.group)} · {mission.no}번 도전
              </span>
              <p className="text-2xl font-extrabold break-keep portrait:text-xl">{st.badge ? "배지를 받았어요!" : `${st.done.length} / ${mission.items.length} 끝냈어요`}</p>
              <span className="flex gap-1.5">
                {mission.items.map((_, i) => (
                  <span key={i} className={`h-3 w-3 rounded-full ${st.done.includes(i) ? "bg-mint-deep" : "bg-paper-deep"}`} />
                ))}
              </span>
            </div>
          </div>

          {/* 놀이 길 — 하나씩 차례로, 다음 할 놀이는 숨 쉬듯 */}
          <div className="grid grid-cols-2 gap-4 portrait:w-full portrait:gap-3 short:gap-2">
            {mission.items.map((x, i) => {
              const done = st.done.includes(i);
              return (
                <MenuCard
                  key={i}
                  tone={done ? "mint" : tone}
                  title={<span className="text-lg portrait:text-base">{KIND_LABEL[x.spec.kind]}</span>}
                  className={`w-[13rem] animate-pop-in portrait:w-auto short:w-[10rem] ${i === next ? "ring-4 ring-pink" : ""}`}
                  style={{ animationDelay: `${i * 70}ms` }}
                  artClassName="aspect-[4/3] flex-none"
                  art={<Icon emoji={KIND_ICON[x.spec.kind]} className="text-[4rem] short:text-[2.8rem] portrait:text-[3.4rem]" />}
                  onClick={() => {
                    sfx.wake();
                    sfx.pop();
                    const seed = freshSeed();
                    setPlaying({ index: i, built: buildActivity(x.spec, seededRng(seed)), key: seed });
                  }}
                >
                  <span className="absolute left-3.5 top-3 grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-extrabold text-ink shadow">{i + 1}</span>
                  {x.quiz && (
                    <span className="absolute right-3 top-3 rounded-full bg-lilac px-2 py-0.5 text-xs font-extrabold">
                      <Icon emoji="⭐" /> 확인
                    </span>
                  )}
                  {done && <span className="absolute bottom-[3.4rem] right-3.5 grid h-9 w-9 place-items-center rounded-full bg-mint-deep text-xl font-extrabold text-white shadow">✓</span>}
                </MenuCard>
              );
            })}
          </div>
        </div>
      </ModeShell>
    );
  }

  // 고른 묶음 — 처음엔 아직 배지가 남은 첫 묶음
  const firstOpen = MISSION_GROUPS.find((g) => MISSIONS.some((m) => m.group === g && !stateOf(m.id).badge)) ?? MISSION_GROUPS[0];
  const current = group ?? firstOpen;
  const tone = toneOfGroup(current);

  return (
    <ModeShell title={menuOf("missions").title} icon="🎯" iconId="menu:missions" scene="missions">
      <div className="flex h-full gap-5 px-6 pb-5 pt-1 short:gap-3 short:px-4 short:pb-2 portrait:flex-col portrait:gap-3 portrait:px-3">
        {/* 배지 판 + 묶음 */}
        <aside className="glass flex w-[16.5rem] shrink-0 flex-col gap-1 overflow-y-auto rounded-[1.8rem] p-2 short:w-[12.5rem] portrait:w-full portrait:flex-row portrait:overflow-x-auto portrait:rounded-[1.4rem] portrait:p-1.5">
          <div className="mb-1 flex shrink-0 items-center gap-2 rounded-[1.3rem] bg-butter/80 px-3 py-2 short:py-1 portrait:mb-0 portrait:px-2.5">
            <Icon id="mission:badge" emoji="🏅" className="text-[2.4rem] short:text-[1.8rem]" />
            <span className="leading-tight">
              <b className="block text-2xl short:text-lg">{badges}</b>
              <span className="whitespace-nowrap text-xs font-bold text-ink-soft">/ {MISSIONS.length} 배지</span>
            </span>
          </div>
          {MISSION_GROUPS.map((g) => {
            const list = MISSIONS.filter((m) => m.group === g);
            const got = list.filter((m) => stateOf(m.id).badge).length;
            const on = g === current;
            return (
              <button
                key={g}
                type="button"
                onClick={() => {
                  sfx.tick();
                  setGroup(g);
                }}
                className={`flex shrink-0 items-center gap-2 rounded-[1.2rem] px-3 py-2 text-left transition-all short:py-1 portrait:px-3 ${
                  on ? "bg-white shadow-[0_6px_16px_-8px_rgb(62_58_82/0.5)]" : "hover:bg-white/60"
                }`}
              >
                <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: `var(--${toneOfGroup(g)}-deep)` }} />
                <span className={`min-w-0 flex-1 truncate text-lg font-extrabold short:text-base portrait:flex-none portrait:text-base ${on ? "text-ink" : "text-ink-soft"}`}>{labelOf(g)}</span>
                <span className={`text-sm font-extrabold ${got === list.length ? "text-butter-deep" : "text-ink-soft"}`}>
                  {got}/{list.length}
                </span>
              </button>
            );
          })}
        </aside>

        {/* 그 묶음의 도전 — 동그란 메달 카드 */}
        <section key={current} className="min-h-0 flex-1 overflow-y-auto pb-2">
          <div className="grid grid-cols-3 gap-5 xl:grid-cols-4 short:grid-cols-4 short:gap-2.5 portrait:grid-cols-2 portrait:gap-3">
            {MISSIONS.filter((m) => m.group === current).map((m, i) => {
              const st = stateOf(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    sfx.wake();
                    sfx.pop();
                    setOpen(m.id);
                  }}
                  className="relative flex animate-pop-in flex-col items-center gap-2.5 rounded-[1.8rem] bg-white px-3 pb-4 pt-5 shadow-[0_14px_30px_-16px_rgb(62_58_82/0.45)] transition-transform active:scale-95 short:gap-1 short:px-2 short:pb-2.5 short:pt-2.5 portrait:gap-2 portrait:px-2 portrait:pb-3 portrait:pt-4"
                  style={{ animationDelay: `${i * 45}ms` }}
                >
                  <span className="absolute left-3 top-2.5 rounded-full bg-paper px-2 text-xs font-extrabold text-ink-soft">{m.no}</span>
                  <Medal mission={m} tone={tone} earned={st.badge} size="min(8.5rem, 26vw, 22vh)" />
                  <span className="px-1 text-center text-lg font-extrabold leading-tight break-keep short:text-sm portrait:text-base">{m.title}</span>
                  <span className="flex gap-1">
                    {m.items.map((_, k) => (
                      <span key={k} className={`h-2.5 w-2.5 rounded-full ${st.done.includes(k) ? "bg-mint-deep" : "bg-paper-deep"}`} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </ModeShell>
  );
}
