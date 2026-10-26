"use client";

import { useEffect, useState } from "react";
import { toneStyle } from "@/components/ui";
import { authHeaders } from "@/lib/auth";
import { progressRate } from "@/lib/progress";
import { emptySaved, toSaved, type Saved } from "@/lib/store";
import { AssessCard, Card, ProgramControls, ProgressSummary, RecordTable, ReportCard } from "./report";
import { ScheduleCard } from "./schedule";

/*
 * 관리자(마스터) 화면 — 아이 계정 만들기·지우기·비밀번호 바꾸기, 아이별 진도율·리포트 보기, 프로그램 관리.
 * 아이 진도는 MongoDB 에 있는 문서를 직접 읽고 바꾼다(/api/progress?profile=아이디).
 * 바꾼 값은 아이 태블릿이 다음에 켜지거나 다시 열릴 때 따라간다(더 최근 값이 이긴다).
 */

interface Child {
  id: string;
  name: string;
  source: "env" | "db";
  saved: Saved | null;
}

type ChildList = { db: boolean; children: Child[] };

/** 아이 목록 + 진도 — 실패하면 보여 줄 말 */
async function fetchChildren(): Promise<ChildList | string> {
  try {
    const res = await fetch("/api/admin/children", { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) return res.status === 401 ? "로그인이 풀렸어요. 다시 로그인해 주세요." : "아이 목록을 못 불러왔어요.";
    const body = (await res.json()) as { db: boolean; children: (Omit<Child, "saved"> & { saved: unknown })[] };
    return { db: body.db, children: body.children.map((c) => ({ ...c, saved: c.saved ? toSaved(c.saved as Record<string, unknown>) : null })) };
  } catch {
    return "연결이 안 돼요.";
  }
}

export function AdminPanel({ today }: { today: string }) {
  const [list, setList] = useState<ChildList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState({ id: "", name: "", password: "" });
  const [newPw, setNewPw] = useState("");
  const [tick, setTick] = useState(0);
  const load = () => setTick((t) => t + 1);

  useEffect(() => {
    let alive = true;
    void fetchChildren().then((r) => {
      if (!alive) return;
      if (typeof r === "string") setError(r);
      else {
        setError(null);
        setList(r);
      }
    });
    return () => {
      alive = false;
    };
  }, [tick]);

  const child = list?.children.find((c) => c.id === sel) ?? null;

  /** 아이 진도 바꾸기 — 지금 시각으로 찍어서 서버에 올린다 */
  const change = async (id: string, fn: (s: Saved) => Saved) => {
    const cur = list?.children.find((c) => c.id === id);
    if (!cur) return;
    const next = { ...fn(cur.saved ?? emptySaved()), updatedAt: Date.now() };
    const res = await fetch(`/api/progress?profile=${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify(next),
    }).catch(() => null);
    if (!res?.ok) window.alert("저장하지 못했어요. 잠시 뒤에 다시 해 주세요.");
    load();
  };

  const saveAccount = async (id: string, name: string, password: string) => {
    const res = await fetch("/api/admin/children", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ id, name, password }),
    }).catch(() => null);
    if (!res) return "연결이 안 돼요.";
    if (res.status === 409) return "이미 있는 아이디예요.";
    if (!res.ok) return "아이디(영문 소문자·숫자 2~32자)와 비밀번호(4자 이상)를 확인해 주세요.";
    load();
    return null;
  };

  return (
    <Card title="👑 관리자 — 아이 관리" right={<button type="button" className="squish rounded-full px-4 py-1 text-base" onClick={load}>새로고침</button>}>
      {error && <p className="mb-3 text-peach-deep">{error}</p>}
      {list && !list.db && <p className="mb-3 rounded-2xl bg-paper p-3 text-base">MongoDB 가 아직 연결되지 않아서 아이 진도를 볼 수 없어요. .env.local 에 MONGODB_URI 를 넣으면 아이 계정 만들기·진도 관리가 켜져요.</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list?.children.map((c) => {
          const p = c.saved?.progress;
          const rate = p ? progressRate(p) : null;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSel(sel === c.id ? null : c.id)}
              className={`squish rounded-2xl p-4 text-left ${sel === c.id ? "ring-4 ring-sky-deep" : ""}`}
            >
              <p className="font-display text-xl">
                {c.name} <span className="text-base text-ink-soft">@{c.id}</span>
              </p>
              {p ? (
                <p className="text-base text-ink-soft">
                  {p.unit}단원 {p.day}일째 · 진도율 {Math.round((rate?.rate ?? 0) * 100)}% · 반딧불이 {p.fireflies}
                  <br />
                  최근 학습 {p.lastPlayedOn?.slice(5).replace("-", ".") ?? "없음"}
                </p>
              ) : (
                <p className="text-base text-ink-soft">아직 학습 기록이 없어요</p>
              )}
            </button>
          );
        })}
        {list && list.children.length === 0 && <p className="text-ink-soft">아이 계정이 없어요. 아래에서 만들어 주세요.</p>}
      </div>

      {list?.db && (
        <form
          className="mt-5 flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const err = await saveAccount(form.id, form.name, form.password);
            if (err) window.alert(err);
            else setForm({ id: "", name: "", password: "" });
          }}
        >
          <span className="w-full text-base text-ink-soft">아이 계정 만들기</span>
          {(["id", "name", "password"] as const).map((k) => (
            <input
              key={k}
              value={form[k]}
              type={k === "password" ? "password" : "text"}
              autoCapitalize="none"
              placeholder={{ id: "아이디 (영문·숫자)", name: "이름 (예: 하늘)", password: "비밀번호 (4자 이상)" }[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              className="min-w-0 flex-1 rounded-2xl border-2 border-paper-deep bg-paper px-4 py-2 select-text"
            />
          ))}
          <button type="submit" className="squish rounded-2xl px-5 py-2" style={toneStyle("mint")}>
            만들기
          </button>
        </form>
      )}

      {child && (
        <div className="mt-6 flex flex-col gap-4 rounded-[1.6rem] bg-paper p-4">
          <p className="font-display text-2xl">
            {child.name} <span className="text-lg text-ink-soft">@{child.id}</span>
          </p>
          {child.saved ? (
            <>
              <div className="rounded-2xl bg-card p-4">
                <ProgressSummary progress={child.saved.progress} today={today} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <ReportCard daily={child.saved.progress.daily} today={today} />
                <AssessCard history={child.saved.progress.history} />
              </div>
              <RecordTable history={child.saved.progress.history} />
            </>
          ) : (
            <p className="text-ink-soft">이 아이디로 아직 학습한 적이 없어요. 아래에서 시작 단원을 정해 둘 수 있어요.</p>
          )}
          {list?.db && <ScheduleCard saved={child.saved ?? emptySaved()} today={today} name={child.name} change={(fn) => void change(child.id, fn)} />}
          {list?.db && <ProgramControls saved={child.saved ?? emptySaved()} today={today} who={child.name} change={(fn) => void change(child.id, fn)} />}
          {child.source === "db" ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={newPw}
                type="password"
                placeholder="새 비밀번호"
                onChange={(e) => setNewPw(e.target.value)}
                className="min-w-0 flex-1 rounded-2xl border-2 border-paper-deep bg-card px-4 py-2 select-text"
              />
              <button
                type="button"
                className="squish rounded-2xl px-5 py-2"
                onClick={async () => {
                  const err = await saveAccount(child.id, child.name, newPw);
                  if (err) window.alert(err);
                  else {
                    setNewPw("");
                    window.alert("비밀번호를 바꿨어요.");
                  }
                }}
              >
                비밀번호 바꾸기
              </button>
              <button
                type="button"
                className="squish rounded-2xl px-5 py-2"
                style={toneStyle("peach")}
                onClick={async () => {
                  if (!window.confirm(`${child.name}(@${child.id}) 계정을 지울까요? 진도 기록은 남아 있다가 같은 아이디로 다시 만들면 이어져요.`)) return;
                  await fetch(`/api/admin/children?id=${encodeURIComponent(child.id)}`, { method: "DELETE", headers: authHeaders() }).catch(() => null);
                  setSel(null);
                  load();
                }}
              >
                계정 지우기
              </button>
            </div>
          ) : (
            <p className="text-base text-ink-soft">이 계정은 서버 설정(ACCOUNTS)에 있어서 여기서 비밀번호를 바꿀 수 없어요.</p>
          )}
        </div>
      )}
    </Card>
  );
}
