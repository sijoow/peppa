"use client";

import { useMemo, useState } from "react";
import { FireflyIcon } from "@/components/FireflyIcon";
import { Peppa } from "@/components/Peppa";
import { Icon } from "@/components/Icon";
import { toneStyle, UiIcon } from "@/components/ui";
import { CHILD } from "@/curriculum/child";
import { stageOutline, unitOutline } from "@/curriculum/outline";
import { currentSession, EVERY_DAY } from "@/lib/progress";
import { dayDiff, isStudyDay, longDate, monthGrid, nickOf, planAhead, shortDate, startDay, streakOf, studyLog, WEEKDAYS, type PlannedDay } from "@/lib/schedule";
import type { Saved } from "@/lib/store";
import { Card } from "./report";

/*
 * 「하온이 스케줄」 — 우리 아이 스케줄 관리: 온 지 며칠째, 공부한 날·연속, 달력(한 날 도장·앞으로 할 모험), 공부하는 요일, 다음 모험 7개.
 * 계산은 lib/schedule(순수). 부모 페이지(내 진도)와 관리자 화면(아이 진도)이 같이 쓴다 — 저장은 change 로 넘겨받는다.
 * 2026-10-26 사용자 요청: "아이가 며칠째 시작했다는 아이만의 스케줄 확인할 수 있는 설정 … 우리 아이의 스케줄 관리처럼"
 */

const WEEKDAYS_ONLY = [1, 2, 3, 4, 5];
/** 계획은 과정 끝까지(270일 + 복습) 넉넉히 */
const PLAN_MAX = 400;

const CHIP_BG: Record<"mint" | "butter" | "sky", string> = { mint: "bg-mint/55", butter: "bg-butter/55", sky: "bg-sky/55" };

function Chip({ label, value, sub, tone, className = "" }: { label: string; value: string; sub?: string; tone: keyof typeof CHIP_BG; className?: string }) {
  return (
    <div className={`min-w-0 rounded-2xl p-3 text-center ${CHIP_BG[tone]} ${className}`}>
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-0.5 font-display text-2xl leading-tight">{value}</p>
      {sub && <p className="mt-0.5 truncate text-sm text-ink-soft">{sub}</p>}
    </div>
  );
}

function planLabel(d: PlannedDay): string {
  return d.review ? `${d.unit}단원 ${d.chapter}장 복습 ${d.review}/5` : `${d.unit}단원 ${d.day}일`;
}

/** 달력 한 칸 */
function DayCell({
  day,
  today,
  start,
  adventure,
  playedOnly,
  planned,
  rest,
  showUnit,
}: {
  day: string;
  today: string;
  start: string;
  adventure: boolean;
  playedOnly: boolean;
  planned: PlannedDay | undefined;
  rest: boolean;
  showUnit: boolean;
}) {
  const isToday = day === today;
  const before = day < start;
  const future = day > today;
  const n = Number(day.slice(8));
  const tone = before ? "text-ink-soft/40" : rest && !adventure && !playedOnly ? "bg-paper-deep/50 text-ink-soft/70" : "bg-card";
  const title = [
    longDate(day),
    day === start ? "시작한 날" : "",
    adventure ? "오늘의 모험을 했어요" : playedOnly ? "다른 놀이를 했어요" : "",
    planned ? `할 모험: ${planLabel(planned)}${planned.assess ? " (확인 놀이)" : ""}` : "",
    rest && !before ? "쉬는 요일" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      title={title}
      className={`relative flex min-h-[2.9rem] min-w-0 flex-col items-center rounded-xl px-0.5 pt-0.5 sm:min-h-[4.2rem] sm:pt-1 lg:min-h-[4.6rem] ${tone} ${isToday ? "ring-[3px] ring-peach-deep" : ""}`}
    >
      <span className={`text-[11px] leading-none sm:text-sm ${isToday ? "font-display text-peach-deep" : ""}`}>{isToday ? "오늘" : n}</span>
      {day === start && !before && <span className="absolute -top-2 left-0.5 rounded-full bg-mint-deep px-1 text-[9px] leading-tight text-white sm:text-[11px]">시작</span>}
      {adventure ? (
        <span className="mt-0.5 grid aspect-square w-[62%] max-w-[2.6rem] place-items-center rounded-full bg-butter shadow-[0_2px_0_var(--butter-deep)] sm:mt-1">
          <FireflyIcon size={28} className="h-[78%] w-[78%]" />
        </span>
      ) : playedOnly ? (
        <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-mint-deep sm:mt-2.5 sm:h-3.5 sm:w-3.5" />
      ) : planned && (future || isToday) ? (
        <span className="mt-0.5 flex flex-col items-center leading-tight sm:mt-1">
          {showUnit && <span className="text-[9px] text-ink-soft sm:text-[11px]">{planned.unit}단원</span>}
          <span
            className={`rounded-full px-1 text-[10px] sm:px-2 sm:text-sm ${planned.review ? "bg-lilac" : "bg-peach/70"} ${planned.assess ? "ring-2 ring-butter-deep" : ""} ${planned.ready ? "" : "opacity-60"}`}
          >
            {planned.review ? "복습" : `${planned.day}일`}
          </span>
        </span>
      ) : null}
    </div>
  );
}

export function ScheduleCard({
  saved,
  today,
  change,
  name = CHILD.nick,
}: {
  saved: Saved;
  today: string;
  change: (fn: (s: Saved) => Saved) => void;
  /** 부르는 이름 — 관리자 화면은 아이 계정 이름 */
  name?: string;
}) {
  const { progress, settings } = saved;
  /** 달력 — 이번 달에서 몇 달 앞뒤 */
  const [offset, setOffset] = useState(0);

  const data = useMemo(() => {
    const start = startDay(progress, settings, today);
    const log = studyLog(progress);
    const plan = planAhead(progress, settings, today, PLAN_MAX);
    return {
      start,
      nth: dayDiff(start, today) + 1,
      log,
      studied: [...log.played].filter((d) => d >= start && d <= today).length,
      streak: streakOf(log.played, today, settings.studyDays),
      plan,
      byDay: new Map(plan.map((d) => [d.on, d])),
    };
  }, [progress, settings, today]);

  if (!today) return null;
  const nick = nickOf(name);
  const { start, nth, log, studied, streak, plan, byDay } = data;

  const session = currentSession(progress);
  const unitNo = session?.plan.unit ?? progress.unit;
  const unit = unitOutline(unitNo);
  const stage = unit ? stageOutline(unit.stage) : undefined;
  const nowValue = session ? (session.review ? `${session.plan.chapter}장 복습` : `${unitNo}단원 ${session.plan.day}일째`) : `${unitNo}단원`;
  const nowSub = session
    ? `${stage?.id}단계 · ${session.review ? `${((session.plan.day - 1) % 5) + 1}/5일째` : (unit?.chapters.find((c) => c.no === session.plan.chapter)?.title ?? "")}`
    : "다음 단원 준비 중";

  const next = plan.slice(0, 7);
  const unitEnd = [...plan].reverse().find((d) => d.unit === unitNo && !d.review)?.on;
  const courseEnd = plan.at(-1)?.on;

  const setSettings = (patch: Partial<Saved["settings"]>) => change((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const toggleDay = (i: number) => {
    const on = settings.studyDays.includes(i);
    if (on && settings.studyDays.length === 1) return;
    setSettings({ studyDays: on ? settings.studyDays.filter((d) => d !== i) : [...settings.studyDays, i].sort((a, b) => a - b) });
  };
  const same = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

  const months = Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7)) - 1 + offset;
  const view = { y: Math.floor(months / 12), m: (months % 12) + 1 };
  const weeks = monthGrid(view.y, view.m);
  const inView = (d: string) => d.startsWith(`${view.y}-${String(view.m).padStart(2, "0")}-`);
  const monthPlayed = [...log.played].filter(inView).length;
  const monthAdventures = progress.history.filter((r) => typeof r.on === "string" && inView(r.on)).length;
  const monthPlanned = plan.filter((d) => inView(d.on)).length;
  // 달력에서 단원 이름은 그 달의 첫 계획 칸과 단원이 바뀌는 날에만
  const firstPlannedInView = weeks.flat().find((d) => d && d >= today && byDay.has(d));

  return (
    <Card title={`${nick} 스케줄`}>
      {/* 폰: 며칠째 → 달력 → 앞으로의 모험 → 요일 설정 / 넓은 화면: 달력은 오른쪽 */}
      <div className="grid gap-5 break-keep lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-x-6">
        <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">
          {/* 온 지 며칠째 */}
          <div className="flex items-center gap-3 rounded-[1.6rem] bg-rose/45 p-4">
            <Peppa size={84} className="shrink-0" />
            <div className="min-w-0">
              {nth >= 1 ? (
                <p className="font-display text-2xl leading-snug sm:text-3xl">
                  {nick}가 한글나라에 온 지 <span className="text-4xl text-peach-deep sm:text-5xl">{nth}</span>일째
                </p>
              ) : (
                <p className="font-display text-2xl leading-snug sm:text-3xl">
                  {nick}의 한글나라는 곧 시작해요 <span className="text-peach-deep">D-{1 - nth}</span>
                </p>
              )}
              <p className="mt-1 text-base text-ink-soft">
                {longDate(start)}에 시작{nth >= 1 ? "했어요" : "해요"}
                {nth === 1 && studied === 0 && <span className="block">오늘이 첫날이에요. 첫 모험을 응원해요!</span>}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.6fr]">
            <Chip label="공부한 날" value={`${studied}일`} tone="mint" />
            <Chip label="연속" value={`${streak}일`} sub={streak >= 3 ? "멋져요!" : undefined} tone="butter" />
            <Chip label="지금" value={nowValue} sub={nowSub} tone="sky" className="col-span-2 sm:col-span-1" />
          </div>
        </div>

        {/* 달력 */}
        <div className="min-w-0 rounded-[1.6rem] bg-paper p-2 sm:p-4 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start">
          <div className="flex items-center justify-between gap-2">
            <button type="button" aria-label="이전 달" onClick={() => setOffset((o) => o - 1)} className="squish grid h-11 w-11 place-items-center rounded-full text-lg">
              <UiIcon name="prev" />
            </button>
            <div className="text-center">
              <p className="font-display text-2xl">
                {view.y}년 {view.m}월
              </p>
              {offset !== 0 && (
                <button type="button" onClick={() => setOffset(0)} className="text-sm text-sky-deep underline">
                  이번 달로
                </button>
              )}
            </div>
            <button type="button" aria-label="다음 달" onClick={() => setOffset((o) => o + 1)} className="squish grid h-11 w-11 place-items-center rounded-full text-lg">
              <UiIcon name="next" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-0.5 text-center text-sm sm:gap-1.5">
            {WEEKDAYS.map((w, i) => (
              <span key={w} className={i === 0 ? "text-peach-deep" : i === 6 ? "text-sky-deep" : "text-ink-soft"}>
                {w}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-0.5 sm:gap-1.5">
            {weeks.flat().map((d, i) => {
              if (!d) return <span key={`blank-${i}`} />;
              const planned = byDay.get(d);
              return (
                <DayCell
                  key={d}
                  day={d}
                  today={today}
                  start={start}
                  adventure={log.adventure.has(d)}
                  playedOnly={!log.adventure.has(d) && log.played.has(d)}
                  planned={planned}
                  rest={!isStudyDay(d, settings.studyDays)}
                  showUnit={!!planned && !planned.review && (d === firstPlannedInView || planned.day === 1)}
                />
              );
            })}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
            <li className="flex items-center gap-1">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-butter">
                <FireflyIcon size={14} />
              </span>
              오늘의 모험
            </li>
            <li className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full bg-mint-deep" />
              다른 놀이만
            </li>
            <li className="flex items-center gap-1">
              <span className="rounded-full bg-peach/70 px-1.5 text-xs text-ink">3일</span>할 모험
            </li>
            <li className="flex items-center gap-1">
              <span className="rounded-full bg-peach/70 px-1.5 text-xs text-ink ring-2 ring-butter-deep">5일</span>확인 놀이
            </li>
            <li className="flex items-center gap-1">
              <span className="h-4 w-4 rounded-md bg-paper-deep/50" />
              쉬는 요일
            </li>
          </ul>
          <p className="mt-2 text-base text-ink-soft">
            {view.m}월에는 <b className="text-ink">{monthPlayed}일</b> 공부했어요 · 오늘의 모험 <b className="text-ink">{monthAdventures}번</b>
            {monthPlanned > 0 && (
              <>
                {" "}
                · 앞으로 <b className="text-ink">{monthPlanned}번</b>
              </>
            )}
          </p>
        </div>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <h3 className="font-display text-xl">앞으로의 모험</h3>
          {next.length === 0 ? (
            <p className="mt-2 text-ink-soft">모든 과정을 마쳤어요! <Icon emoji="🎉" /></p>
          ) : (
            <ol className="mt-2 divide-y divide-paper-deep">
              {next.map((d) => (
                <li key={d.on} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className={`w-[5.6rem] shrink-0 font-display ${d.on === today ? "text-peach-deep" : ""}`}>{d.on === today ? "오늘" : shortDate(d.on)}</span>
                  <span className={`shrink-0 rounded-full px-3 py-0.5 text-base ${d.review ? "bg-lilac" : "bg-paper"}`}>{planLabel(d)}</span>
                  {d.assess && <span className="shrink-0 rounded-full bg-butter px-2 text-sm">
                    <Icon emoji="⭐" /> 확인 놀이
                  </span>}
                  {!d.ready && <span className="shrink-0 rounded-full bg-paper-deep px-2 text-sm">준비 중</span>}
                  <span className="min-w-0 basis-full truncate text-base text-ink-soft sm:basis-auto sm:flex-1">{d.title}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-2 text-base text-ink-soft">
            {unitEnd && (
              <>
                {unitNo}단원은 <b className="text-ink">{shortDate(unitEnd)}</b>에 마쳐요.{" "}
              </>
            )}
            {courseEnd && (
              <>
                전체 과정(6단계)은 <b className="text-ink">{longDate(courseEnd)}</b>쯤 끝나요.
              </>
            )}
            <span className="block text-sm">
              확인 놀이를 모두 통과한다고 보고 계산했어요. 복습이 생기면 5일씩 뒤로 밀려요.{settings.oneADay ? "" : " 지금은 '하루 한 번'이 꺼져 있어서 더 빨리 갈 수도 있어요."}
            </span>
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-3">
          <div>
            <h3 className="font-display text-xl">공부하는 요일</h3>
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((w, i) => {
                const on = settings.studyDays.includes(i);
                return (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${w}요일 ${on ? "공부해요" : "쉬어요"}`}
                    onClick={() => toggleDay(i)}
                    className={`squish rounded-2xl py-2 font-display text-lg ${on ? "" : "text-ink-soft"}`}
                    style={toneStyle(on ? "mint" : "card")}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {(
                [
                  ["매일", EVERY_DAY],
                  ["평일만", WEEKDAYS_ONLY],
                ] as const
              ).map(([label, days]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={same(settings.studyDays, days)}
                  onClick={() => setSettings({ studyDays: [...days] })}
                  className={`rounded-full px-4 py-1 text-base ${same(settings.studyDays, days) ? "bg-sky/60 ring-2 ring-sky-deep" : "bg-paper"}`}
                >
                  {label}
                </button>
              ))}
              <span className="text-sm text-ink-soft">달력과 앞으로의 계획에만 쓰여요 — 쉬는 요일에도 아이가 들어오면 놀 수 있어요.</span>
            </div>
          </div>

          <details className="text-base">
            <summary className="cursor-pointer text-ink-soft">시작한 날 바꾸기</summary>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={start}
                onChange={(e) => setSettings({ startOn: /^\d{4}-\d{2}-\d{2}$/.test(e.target.value) ? e.target.value : null })}
                className="rounded-2xl border-2 border-paper-deep bg-card px-3 py-2 select-text"
              />
              {settings.startOn && (
                <button type="button" className="squish rounded-2xl px-4 py-2" onClick={() => setSettings({ startOn: null })}>
                  처음 놀이한 날로
                </button>
              )}
              <span className="text-sm text-ink-soft">
                {settings.startOn ? "직접 정한 날이에요." : progress.firstOn ? "처음 한글 놀이를 한 날로 정해져 있어요." : "아직 놀이 기록이 없어서 오늘로 보여요."}
              </span>
            </div>
          </details>
        </div>
      </div>
    </Card>
  );
}
