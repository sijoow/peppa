"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { CheckMark, toneStyle, UiIcon } from "@/components/ui";
import { hasContent } from "@/curriculum/days";
import { START_LEVELS, stageOutline, unitOutline } from "@/curriculum/outline";
import { LINES } from "@/curriculum/lines";
import { lockOrientation } from "@/lib/orientation";
import { currentSession, daysBefore, initialProgress, progressRate, restartAt, type DayStat, type DoneRecord, type Progress } from "@/lib/progress";
import type { Saved } from "@/lib/store";
import { say } from "@/lib/voice";
import { VOICES } from "@/lib/voices";

/*
 * 부모·관리자 화면 조각 — 내 진도(부모 페이지)와 아이 진도(관리자 화면)가 같은 조각을 쓴다.
 */

export function Card({ title, children, right }: { title: ReactNode; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-[0_14px_34px_-18px_rgb(62_58_82/0.35)] ring-1 ring-ink/5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl text-ink">{title}</h2>
        {right}
      </div>
      <div className="font-body text-lg text-ink">{children}</div>
    </section>
  );
}

export function RateBar({ label, done, total, rate }: { label: string; done: number; total: number; rate: number }) {
  return (
    <div className="mt-3">
      <div className="flex justify-between text-base">
        <span>{label}</span>
        <span className="text-ink-soft">
          {done}/{total}일 · <b className="text-ink">{Math.round(rate * 100)}%</b>
        </span>
      </div>
      <div className="mt-1 h-4 overflow-hidden rounded-full bg-paper">
        <div className="h-full rounded-full bg-mint-deep transition-all" style={{ width: `${Math.max(rate * 100, rate > 0 ? 2 : 0)}%` }} />
      </div>
    </div>
  );
}

const EMPTY: DayStat = { ms: 0, acts: 0, earned: 0 };
/** 막대 색 — 흰 카드 위 대비 3:1 이상(dataviz 검사 통과). 기본 하늘색(#58a8e6)은 2.5:1 이라 한 단계 진하게 */
const BAR = "#3d8fd1";
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export function minutes(ms: number): string {
  if (ms <= 0) return "0분";
  const m = Math.round(ms / 60_000);
  return m < 1 ? "1분 미만" : `${m}분`;
}

function weekdayOf(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return WEEKDAY[new Date(y, m - 1, d).getDay()];
}

function StatTile({ label, s }: { label: string; s: DayStat }) {
  return (
    <div className="rounded-2xl bg-paper p-4">
      <p className="text-base text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-3xl">{minutes(s.ms)}</p>
      <p className="text-base text-ink-soft">
        활동 {s.acts}개 · 반딧불이 +{s.earned}
      </p>
    </div>
  );
}

/** 지금 진도 — 단계·단원·몇째 날, 진도율 */
export function ProgressSummary({ progress, today }: { progress: Progress; today: string }) {
  const session = currentSession(progress);
  const unit = unitOutline(session?.plan.unit ?? progress.unit);
  const stage = unit ? stageOutline(unit.stage) : undefined;
  const weekAgo = today ? daysBefore(today, 6) : "";
  const playedThisWeek = Object.keys(progress.daily).filter((d) => d >= weekAgo && (progress.daily[d]?.ms ?? 0) > 0).length;
  return (
    <>
      <p className="text-ink-soft">
        {stage?.id}단계 {stage?.title}
      </p>
      <p className="mt-1 text-2xl">
        {unit?.id}단원 · {session ? (session.review ? `${session.plan.chapter}장 복습 ${((session.plan.day - 1) % 5) + 1}/5일째` : `${session.plan.day}일째`) : "다음 단원 준비 중"}
      </p>
      <p className="mt-1 text-ink-soft">{unit?.title}</p>
      <p className="mt-3">
        반딧불이 <b>{progress.fireflies}</b>마리 · 최근 7일 중 <b>{playedThisWeek}</b>일 학습 · 오늘 모험 {progress.lastPlayedOn === today ? (
          <span className="inline-flex items-center gap-1 font-bold text-mint-deep">
            <UiIcon name="check" /> 했어요
          </span>
        ) : (
          "아직이에요"
        )}
      </p>
      {stage && <RateBar label={`${stage.id}단계 진도율`} {...progressRate(progress, stage.id)} />}
      <RateBar label="전체 진도율 (6단계)" {...progressRate(progress)} />
    </>
  );
}

/** 학습 리포트 — 토도 일일·주간 리포트처럼 학습 시간·활동 수·반딧불이 (모든 메뉴 합) */
export function ReportCard({ daily, today }: { daily: Record<string, DayStat>; today: string }) {
  const days = Array.from({ length: 7 }, (_, i) => daysBefore(today, 6 - i));
  const rows = days.map((d) => ({ d, s: daily[d] ?? EMPTY }));
  const week = rows.reduce((a, r) => ({ ms: a.ms + r.s.ms, acts: a.acts + r.s.acts, earned: a.earned + r.s.earned }), EMPTY);
  const max = Math.max(...rows.map((r) => r.s.ms));
  const scale = Math.max(max, 5 * 60_000);
  // 숫자는 오늘과 가장 많이 한 날에만 — 막대마다 숫자를 다 달면 읽기 어렵다(나머지는 막대를 누르거나 표로)
  const labelled = new Set([today, rows.find((r) => r.s.ms === max && max > 0)?.d]);
  return (
    <Card title="학습 리포트">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="오늘" s={daily[today] ?? EMPTY} />
        <StatTile label="최근 7일" s={week} />
      </div>
      <p className="mt-5 text-base text-ink-soft">최근 7일 학습 시간</p>
      <div className="mt-2 flex h-40 items-end gap-[2px] border-b-2 border-paper-deep" role="img" aria-label="최근 7일 날짜별 학습 시간 막대 그래프">
        {rows.map(({ d, s }) => (
          <div key={d} className="flex h-full flex-1 flex-col items-center justify-end" title={`${d.slice(5).replace("-", ".")} · ${minutes(s.ms)} · 활동 ${s.acts}개`}>
            {labelled.has(d) && s.ms > 0 && <span className="mb-1 text-sm text-ink">{minutes(s.ms)}</span>}
            <div className="w-3/5 rounded-t-[4px]" style={{ height: `${(s.ms / scale) * 85}%`, minHeight: s.ms > 0 ? 4 : 0, background: BAR }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {rows.map(({ d }) => (
          <span key={d} className={`flex-1 text-center text-sm ${d === today ? "font-bold text-ink" : "text-ink-soft"}`}>
            {d === today ? "오늘" : weekdayOf(d)}
          </span>
        ))}
      </div>
      <details className="mt-3 text-base">
        <summary className="cursor-pointer text-ink-soft">표로 보기</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-ink-soft">
            <tr>
              <th className="font-normal">날짜</th>
              <th className="font-normal">학습 시간</th>
              <th className="font-normal">활동</th>
              <th className="font-normal">반딧불이</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ d, s }) => (
              <tr key={d} className="border-t border-paper-deep">
                <td>
                  {d.slice(5).replace("-", ".")} ({weekdayOf(d)})
                </td>
                <td>{minutes(s.ms)}</td>
                <td>{s.acts}</td>
                <td>+{s.earned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}

/** 장별 평가 표 — 토도 '학습 평가 표'처럼 장마다 목표와 확인 놀이 결과 */
export function AssessCard({ history }: { history: DoneRecord[] }) {
  const tests = history.filter((r) => r.assess && !r.review);
  return (
    <Card title="장별 평가">
      {tests.length === 0 ? (
        <p className="text-ink-soft">아직 확인 놀이(5일째)를 한 장이 없어요.</p>
      ) : (
        <table className="w-full text-left">
          <thead className="text-ink-soft">
            <tr>
              <th className="py-1 font-normal">장</th>
              <th className="py-1 font-normal">학습 목표</th>
              <th className="py-1 font-normal">결과</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((r, i) => {
              const ch = Math.ceil(r.day / 5);
              const goal = unitOutline(r.unit)?.chapters.find((c) => c.no === ch)?.title ?? "";
              return (
                <tr key={i} className="border-t border-paper-deep">
                  <td className="whitespace-nowrap py-2">
                    {r.unit}단원 {ch}장
                  </td>
                  <td className="py-2">{goal}</td>
                  <td className="whitespace-nowrap py-2">
                    {r.total > 0 ? `${Math.round((r.correct / r.total) * 100)}%` : "—"}{" "}
                    <span className={`rounded-full px-2 text-sm ${r.passed ? "bg-mint" : "bg-lilac"}`}>{r.passed ? "통과" : "복습"}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function recordLabel(r: DoneRecord): string {
  if (r.review) return `${r.unit}단원 ${Math.ceil(r.day / 5)}장 복습`;
  return `${r.unit}단원 ${r.day}일째${r.assess ? " · 확인 놀이" : ""}`;
}

/** 오늘의 모험 기록 — 최근 30개 */
export function RecordTable({ history }: { history: DoneRecord[] }) {
  const recent = [...history].reverse().slice(0, 30);
  return (
    <Card title="오늘의 모험 기록">
      {recent.length === 0 ? (
        <p className="text-ink-soft">아직 기록이 없어요.</p>
      ) : (
        <table className="w-full text-left">
          <thead className="text-ink-soft">
            <tr>
              <th className="py-1 font-normal">날짜</th>
              <th className="py-1 font-normal">학습</th>
              <th className="py-1 font-normal">첫 시도 정답</th>
              <th className="py-1 font-normal">시간</th>
              <th className="py-1 font-normal">반딧불이</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r, i) => (
              <tr key={i} className="border-t border-paper-deep">
                <td className="py-2">{r.on.slice(5).replace("-", ".")}</td>
                <td className="py-2">
                  {recordLabel(r)}
                  {r.passed === true && <span className="ml-2 rounded-full bg-mint px-2 text-sm">통과</span>}
                  {r.passed === false && <span className="ml-2 rounded-full bg-lilac px-2 text-sm">복습</span>}
                </td>
                <td className="py-2">{r.total > 0 ? `${r.correct}/${r.total} (${Math.round((r.correct / r.total) * 100)}%)` : "—"}</td>
                <td className="py-2">{r.ms ? minutes(r.ms) : "—"}</td>
                <td className="py-2">+{r.fireflies}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

/**
 * 프로그램 관리 — 하루 한 번, 오늘 한 판 더, 시작 단원(토도 6단계), 진도 초기화.
 * 내 진도에는 기기 저장(updateSaved), 아이 진도에는 서버 저장(관리자 화면)을 change 로 넘긴다.
 */
export function ProgramControls({ saved, today, change, who }: { saved: Saved; today: string; change: (fn: (s: Saved) => Saved) => void; who: string }) {
  const { progress, settings } = saved;
  const played = progress.lastPlayedOn === today && progress.extraOn !== today;
  const restart = (u: number) => {
    if (!window.confirm(`${who} — ${u}단원부터 다시 시작할까요? 오늘의 모험 진도가 ${u}단원 1일로 바뀌어요. (반딧불이·기록은 남아요)`)) return;
    change((s) => ({ ...s, progress: restartAt(s.progress, u) }));
  };
  return (
    <Card title="프로그램 관리">
      <label className="flex items-center justify-between gap-4">
        <span>하루 한 번만 (우리가 정한 규칙 — 토도 자료에는 없음)</span>
        <input
          type="checkbox"
          className="h-7 w-7 accent-[var(--mint-deep)]"
          checked={settings.oneADay}
          onChange={(e) => change((s) => ({ ...s, settings: { ...s.settings, oneADay: e.target.checked } }))}
        />
      </label>
      <button
        type="button"
        disabled={!played}
        onClick={() => change((s) => ({ ...s, progress: { ...s.progress, extraOn: today } }))}
        className="squish mt-3 w-full rounded-2xl px-5 py-3 text-left disabled:opacity-50"
        style={toneStyle("butter")}
      >
        오늘 한 판 더 열기 {played ? "" : "(지금 할 수 있어요)"}
      </button>
      <p className="mt-5 text-base text-ink-soft">성우 (목소리)</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {VOICES.map((v) => {
          const on = settings.voice === v.id;
          return (
            <div key={v.id} className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-colors ${on ? "bg-pink-soft ring-2 ring-pink" : "bg-white ring-1 ring-ink/10"}`}>
              <button
                type="button"
                className="flex flex-1 items-center gap-3 text-left font-display text-2xl"
                aria-pressed={on}
                onClick={() => change((s) => ({ ...s, settings: { ...s.settings, voice: v.id } }))}
              >
                <CheckMark on={on} /> {v.name}
              </button>
              <button type="button" className="squish flex items-center gap-1.5 rounded-full px-4 py-2 text-base" onClick={() => void say(LINES.greet, v.id)}>
                <UiIcon name="play" /> 들어 보기
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-base text-ink-soft">화면 보기 — 고르면 다음부터 이 모드로 보여요. 폰 브라우저는 화면을 처음 누를 때 전체 화면으로 바뀌며 고정돼요(컴퓨터는 그대로)</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(
          [
            ["portrait", "세로 모드"],
            ["landscape", "가로 모드"],
          ] as const
        ).map(([o, label]) => {
          const on = settings.orientation === o;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              className={`flex items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-left font-display text-2xl transition-colors portrait:gap-2 portrait:px-3 portrait:text-xl ${on ? "bg-pink-soft ring-2 ring-pink" : "bg-white ring-1 ring-ink/10"}`}
              onClick={() => {
                change((s) => ({ ...s, settings: { ...s.settings, orientation: o } }));
                // 누르는 지금이 사용자 동작 — 웹 모바일도 바로 전체 화면 + 고정
                lockOrientation(o);
              }}
            >
              <CheckMark on={on} />
              <UiIcon name={o} className="text-ink-soft" />
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-5 text-base text-ink-soft">시작 단원 바꾸기 (토도한글 6단계)</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {START_LEVELS.map((l) => {
          const ready = hasContent(l.unit);
          const diagOnly = l.unit === 12 && progress.diagnosed?.unit !== 12;
          return (
            <button key={l.unit} type="button" disabled={!ready || diagOnly} onClick={() => restart(l.unit)} className="squish rounded-2xl p-3 text-left disabled:cursor-not-allowed">
              <p className="font-display text-lg">
                {l.label} <span className="text-ink-soft">→ {l.unit}단원</span>
              </p>
              <p className="text-sm text-ink-soft">{l.desc}</p>
              {diagOnly ? <p className="text-sm text-peach-deep">단원 찾기 퀴즈로만 열려요</p> : !ready && <p className="text-sm text-peach-deep">오늘의 모험 하루치 준비 중</p>}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href="/diagnose" className="squish rounded-2xl px-5 py-2 font-display text-lg" style={toneStyle("sky")}>
          <Icon emoji="🧭" /> 단원 찾기 퀴즈
        </Link>
        <span className="text-base text-ink-soft">
          {progress.diagnosed ? `최근 결과: ${progress.diagnosed.on.slice(5).replace("-", ".")} → ${progress.diagnosed.unit}단원 추천` : "퀴즈는 로그인한 아이디로 풀어요."}
        </span>
        <button
          type="button"
          className="squish ml-auto rounded-2xl px-5 py-2"
          style={toneStyle("peach")}
          onClick={() => {
            if (!window.confirm(`${who} — 진도·반딧불이·기록을 모두 지우고 1단원부터 시작할까요?`)) return;
            change((s) => ({ ...s, progress: initialProgress() }));
          }}
        >
          진도 초기화
        </button>
      </div>
    </Card>
  );
}
