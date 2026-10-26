/**
 * 기기 ↔ MongoDB 맞추기 (app/api/progress) — 로그인한 아이디의 문서와 맞춘다.
 *   앱을 켤 때·다시 열 때·인터넷이 돌아올 때·다른 아이디로 들어올 때 → 서버 값을 읽어 더 최신 쪽으로 맞춘다
 *   기기에서 바뀌면 → 0.8초 모았다가 서버로 올린다(끊겨 있으면 다음 기회에)
 * 서버가 꺼져 있거나(DB 미설정) 로그인이 풀려도 아이 화면은 기기 저장만으로 그대로 돈다.
 */

import { useSyncExternalStore } from "react";
import { authHeaders, currentAuth, subscribeAuth } from "@/lib/auth";
import { readSaved, replaceSaved, setAfterLocalWrite, toSaved, type Saved } from "@/lib/store";

const API = "/api/progress";

export type SyncState = "starting" | "syncing" | "ok" | "off" | "locked" | "error";
export interface SyncStatus {
  state: SyncState;
  /** 마지막으로 서버와 맞춘 시각(ms) */
  at: number | null;
}

let status: SyncStatus = { state: "starting", at: null };
const listeners = new Set<() => void>();
let timer: number | null = null;
let started = false;

function setStatus(s: SyncStatus) {
  status = s;
  listeners.forEach((l) => l());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status,
    () => status,
  );
}

async function call(method: "GET" | "PUT", body?: Saved): Promise<Response | null> {
  try {
    return await fetch(API, {
      method,
      cache: "no-store",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return null;
  }
}

/** 서버가 못 받는 상태(503 DB 꺼짐 · 401 로그인 풀림) — 상태만 적고 끝 */
function blocked(res: Response): boolean {
  if (res.status === 503) setStatus({ state: "off", at: status.at });
  else if (res.status === 401) setStatus({ state: "locked", at: status.at });
  else return false;
  return true;
}

export async function push(): Promise<void> {
  if (!currentAuth()) return;
  setStatus({ ...status, state: "syncing" });
  const res = await call("PUT", readSaved());
  if (!res) return setStatus({ state: "error", at: status.at });
  if (blocked(res)) return;
  if (res.status === 409) {
    // 다른 기기(또는 관리자)가 더 최근에 바꿨다 — 그 값을 따른다
    const { saved } = (await res.json()) as { saved?: unknown };
    if (saved) replaceSaved(toSaved(saved as Record<string, unknown>));
    return setStatus({ state: "ok", at: Date.now() });
  }
  if (!res.ok) return setStatus({ state: "error", at: status.at });
  setStatus({ state: "ok", at: Date.now() });
}

export async function pull(): Promise<void> {
  if (!currentAuth()) return;
  setStatus({ ...status, state: "syncing" });
  const res = await call("GET");
  if (!res) return setStatus({ state: "error", at: status.at });
  if (blocked(res)) return;
  if (!res.ok) return setStatus({ state: "error", at: status.at });
  const { saved } = (await res.json()) as { saved: Record<string, unknown> | null };
  const server = saved ? toSaved(saved) : null;
  const local = readSaved();
  if (server && server.updatedAt > local.updatedAt) {
    replaceSaved(server);
    return setStatus({ state: "ok", at: Date.now() });
  }
  if (!server || local.updatedAt > server.updatedAt) return push();
  setStatus({ state: "ok", at: Date.now() });
}

function schedulePush() {
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    timer = null;
    void push();
  }, 800);
}

/** 로그인한 뒤 한 번 (components/SyncBoot) */
export function startSync(): void {
  if (started) return;
  started = true;
  setAfterLocalWrite(schedulePush);
  void pull();
  subscribeAuth(() => void pull());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void pull();
  });
  window.addEventListener("online", () => void pull());
}
