"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { CheckMark, Splash, toneStyle, UiIcon } from "@/components/ui";
import { BUILT_UNITS, hasContent, unitDays } from "@/curriculum/days";
import { LINES } from "@/curriculum/lines";
import { STAGES, UNITS } from "@/curriculum/outline";
import { logout, useAuth } from "@/lib/auth";
import { updateSaved, useSaved, useToday } from "@/lib/store";
import { pull, useSyncStatus, type SyncState } from "@/lib/sync";
import { say, voiceStatus } from "@/lib/voice";
import { VOICES } from "@/lib/voices";
import { AdminPanel } from "./AdminPanel";
import { AssessCard, Card, ProgramControls, ProgressSummary, RecordTable, ReportCard } from "./report";
import { ScheduleCard } from "./schedule";

const SYNC_LABEL: Record<SyncState, string> = {
  starting: "확인 중…",
  syncing: "맞추는 중…",
  ok: "저장됨",
  off: "꺼짐 — 서버에 MONGODB_URI 가 없어요 (지금은 이 기기에만 저장)",
  locked: "로그인이 풀렸어요 — 로그아웃 후 다시 들어와 주세요",
  error: "연결이 안 돼요 — 기기에 저장해 두고 다음에 올려요",
};

/** MongoDB 저장 상태 */
function SyncCard() {
  const st = useSyncStatus();
  return (
    <Card title="MongoDB 저장">
      <p>
        상태: <b>{SYNC_LABEL[st.state]}</b>
        {st.at && <span className="text-ink-soft"> · 마지막 {new Date(st.at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>}
      </p>
      <button type="button" className="squish mt-3 rounded-2xl px-5 py-2" onClick={() => void pull()}>
        지금 맞추기
      </button>
      <p className="mt-3 text-base text-ink-soft">진도·설정·학습 기록은 아이디마다 문서 하나로 저장돼요(DB todohangul · progress). 두 기기에서 쓰면 더 최근에 바꾼 쪽을 따라가요.</p>
    </Card>
  );
}

/** 부모 페이지 — 로그인한 아이디의 진도·리포트·프로그램 관리. 마스터 아이디면 아이 관리까지 */
export default function ParentScreen() {
  const saved = useSaved();
  const auth = useAuth();
  const today = useToday();
  const [voice, setVoice] = useState<ReturnType<typeof voiceStatus> | null>(null);
  if (!saved || !auth) return <Splash />;

  const { progress } = saved;
  const master = auth.user.role === "master";

  return (
    <main className="min-h-dvh bg-paper px-5 py-6 lg:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex items-center justify-between gap-3 print:hidden">
          <h1 className="font-display text-4xl">{master ? "관리자 페이지" : "부모 페이지"}</h1>
          <div className="flex gap-3">
            <button type="button" className="squish rounded-full px-5 py-3 font-display text-xl" onClick={() => window.print()}>
              <span className="inline-flex items-center gap-2">
                <UiIcon name="print" /> 인쇄·PDF
              </span>
            </button>
            <Link href="/" className="squish rounded-full px-6 py-3 font-display text-2xl">
              <Icon emoji="🏠" /> 아이 화면으로
            </Link>
          </div>
        </header>

        <Card
          title="로그인"
          right={
            <button
              type="button"
              className="squish rounded-full px-5 py-2"
              style={toneStyle("peach")}
              onClick={() => {
                if (window.confirm("로그아웃할까요? 다음에 아이디·비밀번호를 다시 넣어야 해요.")) logout();
              }}
            >
              로그아웃
            </button>
          }
        >
          <p>
            <b className="font-display text-2xl">@{auth.user.id}</b> · {master ? "마스터(관리자) — 모든 메뉴가 열리고 하루 한 번 제한이 없어요" : "아이 — 진도대로 메뉴가 열려요"}
          </p>
        </Card>

        {master && <AdminPanel today={today} />}

        <ScheduleCard saved={saved} today={today} change={(fn) => updateSaved(fn)} />

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title={master ? "이 아이디의 진도 (미리 보기용)" : "지금 진도"}>
            <ProgressSummary progress={progress} today={today} />
          </Card>
          <ReportCard daily={progress.daily} today={today} />
        </div>

        <ProgramControls saved={saved} today={today} who={`@${auth.user.id}`} change={(fn) => updateSaved(fn)} />

        <div className="grid gap-5 lg:grid-cols-2">
          <AssessCard history={progress.history} />
          <RecordTable history={progress.history} />
        </div>

        <Card title="미리 보기 (진도에 남지 않아요)">
          {BUILT_UNITS.map((u) => (
            <div key={u} className="mb-4">
              <p className="mb-2 text-ink-soft">{u}단원</p>
              <div className="flex flex-wrap gap-2">
                {unitDays(u).map((d) => (
                  <Link key={d.day} href={`/play?preview=u${u}d${d.day}`} className={`rounded-xl px-3 py-2 ${d.assess ? "bg-butter" : "bg-paper"}`} title={d.title}>
                    {d.day}일 {d.assess && <Icon emoji="⭐" />}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </Card>

        <Card title="전체 과정표 (6단계 · 14단원 · 54장)">
          <div className="grid gap-4 lg:grid-cols-2">
            {STAGES.map((s) => (
              <div key={s.id}>
                <p className="font-display text-xl">
                  {s.id}단계 {s.title}
                </p>
                <ul className="mt-1 space-y-1">
                  {UNITS.filter((u) => u.stage === s.id).map((u) => (
                    <li key={u.id}>
                      <details>
                        <summary className="cursor-pointer">
                          {u.id}단원 {u.title} {hasContent(u.id) ? <CheckMark on className="ml-1 inline-grid h-5 w-5 align-middle text-xs" /> : <span className="text-ink-soft">(준비 중)</span>}
                        </summary>
                        <ul className="ml-5 list-disc text-base text-ink-soft">
                          {u.chapters.map((c) => (
                            <li key={c.no}>
                              {c.no}장 {c.title}
                            </li>
                          ))}
                        </ul>
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <SyncCard />

        <Card title="목소리">
          <p>성우는 위 &lsquo;프로그램 관리&rsquo;에서 골라요(민정·수아). 구워 둔 음성 파일이 없는 말은 기기 기본 음성으로 읽어요.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="squish rounded-2xl px-5 py-3"
              onClick={() => {
                setVoice(voiceStatus());
                void say(LINES.greet);
              }}
            >
              지금 목소리 들어 보기
            </button>
            {voice && (
              <span className="text-ink-soft">
                구운 파일 {VOICES.map((v) => `${v.name} ${voice.files[v.id]}개`).join(" · ")} · 기기 음성 {voice.deviceVoice ?? "한국어 음성 없음"}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm text-ink-soft">음성: Typecast(타입캐스트) — 성우 민정·수아</p>
        </Card>
      </div>
    </main>
  );
}
