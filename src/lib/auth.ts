/**
 * 기기의 로그인 — 열쇠(토큰)와 아이디·역할을 기억한다(태블릿은 한 번 로그인하면 1년).
 * 진도 저장 칸(lib/store)과 MongoDB 맞추기(lib/sync)가 이 아이디를 따라간다.
 *   master — 마스터(관리자·미리 보기): 모든 메뉴 열림, 하루 한 번 제한 없음, 아이 계정 관리
 *   child  — 아이: 진도대로
 */

import { useSyncExternalStore } from "react";

export type Role = "master" | "child";

export interface AuthUser {
  id: string;
  role: Role;
}

export interface Auth {
  token: string;
  user: AuthUser;
}

const KEY = "todo-hangul:auth";
const listeners = new Set<() => void>();
let memory: string | null = null;
let lastRaw: string | null | undefined;
let lastVal: Auth | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return memory;
  }
}

function parse(raw: string | null): Auth | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { token?: unknown; user?: { id?: unknown; role?: unknown } };
    if (typeof o.token !== "string" || typeof o.user?.id !== "string") return null;
    return { token: o.token, user: { id: o.user.id, role: o.user.role === "master" ? "master" : "child" } };
  } catch {
    return null;
  }
}

function read(): Auth | null {
  const raw = readRaw();
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastVal = parse(raw);
  }
  return lastVal;
}

function write(a: Auth | null) {
  const raw = a ? JSON.stringify(a) : null;
  memory = raw;
  try {
    if (raw) window.localStorage.setItem(KEY, raw);
    else window.localStorage.removeItem(KEY);
  } catch {
    // 저장이 막힌 기기 — 이번 실행 동안만 기억
  }
  listeners.forEach((l) => l());
}

export function currentAuth(): Auth | null {
  return typeof window === "undefined" ? null : read();
}

export function subscribeAuth(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** undefined = 아직 모름(서버에서 그릴 때), null = 로그인 안 됨 */
export function useAuth(): Auth | null | undefined {
  return useSyncExternalStore(subscribeAuth, read, () => undefined);
}

export function useIsMaster(): boolean {
  return useAuth()?.user.role === "master";
}

export function authHeaders(): Record<string, string> {
  const a = currentAuth();
  return a ? { authorization: `Bearer ${a.token}` } : {};
}

/** 로그인 — 실패하면 아이에게 보여 줄 말을 돌려준다 */
export async function login(id: string, password: string): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: id.trim(), password }),
    });
  } catch {
    return "연결이 안 돼요. 인터넷을 확인해 주세요.";
  }
  if (res.status === 401) return "아이디나 비밀번호가 달라요.";
  if (!res.ok) return "잠시 뒤에 다시 해 주세요.";
  const { token, user } = (await res.json()) as { token: string; user: AuthUser };
  write({ token, user: { id: user.id, role: user.role === "master" ? "master" : "child" } });
  return null;
}

export function logout(): void {
  write(null);
}
