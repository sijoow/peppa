/**
 * 진도·설정 저장 — 로그인한 아이디마다 따로, 기기 안(localStorage)에 먼저 쓴다. MongoDB 로 올리는 일은 lib/sync.ts.
 * 화면은 useSaved() 로 읽고 updateSaved() 로 바꾼다(다른 탭에서 바꾸거나 다른 아이디로 들어가도 따라온다).
 * 저장이 막힌 기기(사생활 보호 모드 등)에서는 메모리에만 두고 앱은 그대로 돈다.
 */

import { useSyncExternalStore } from "react";
import { currentAuth, subscribeAuth } from "@/lib/auth";
import {
  DEFAULT_SETTINGS,
  initialProgress,
  localDay,
  normalizeProgress,
  normalizeSettings,
  type Progress,
  type Settings,
} from "@/lib/progress";

/** 로그인 기능 전(아이디 하나)일 때 쓰던 칸 — 처음 들어온 아이 아이디로 옮긴다 */
const LEGACY_KEY = "todo-hangul:v1";

export interface Saved {
  progress: Progress;
  settings: Settings;
  /** 이 기기에서 마지막으로 바꾼 시각(ms) — 서버와 맞출 때 더 최신 쪽이 이긴다. 한 번도 안 바꿨으면 0 */
  updatedAt: number;
}

const listeners = new Set<() => void>();
const memory = new Map<string, string>();
let useMemory = false;
let lastKey: string | undefined;
let lastRaw: string | null | undefined;
let lastValue: Saved | null = null;
let afterLocalWrite: (() => void) | null = null;

function keyNow(): string {
  return `${LEGACY_KEY}:${currentAuth()?.user.id ?? "guest"}`;
}

function readRaw(key: string): string | null {
  if (useMemory) return memory.get(key) ?? null;
  try {
    let raw = window.localStorage.getItem(key);
    if (raw === null && currentAuth()?.user.role === "child") {
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        window.localStorage.setItem(key, legacy);
        window.localStorage.removeItem(LEGACY_KEY);
        raw = legacy;
      }
    }
    return raw;
  } catch {
    useMemory = true;
    return memory.get(key) ?? null;
  }
}

/** 어디서 온 값이든(기기·서버) 모양을 검사해서 Saved 로 */
export function toSaved(o: { progress?: unknown; settings?: unknown; updatedAt?: unknown } | null | undefined): Saved {
  return {
    progress: normalizeProgress(o?.progress),
    settings: normalizeSettings(o?.settings),
    updatedAt: typeof o?.updatedAt === "number" && Number.isFinite(o.updatedAt) ? o.updatedAt : 0,
  };
}

export function emptySaved(): Saved {
  return { progress: initialProgress(), settings: DEFAULT_SETTINGS, updatedAt: 0 };
}

function parse(raw: string | null): Saved {
  if (!raw) return emptySaved();
  try {
    return toSaved(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return emptySaved();
  }
}

function getSnapshot(): Saved {
  const key = keyNow();
  const raw = readRaw(key);
  // 같은 칸·같은 글이면 같은 객체를 돌려줘야 React 가 다시 그리기를 멈춘다
  if (key !== lastKey || raw !== lastRaw || !lastValue) {
    lastKey = key;
    lastRaw = raw;
    lastValue = parse(raw);
  }
  return lastValue;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const offAuth = subscribeAuth(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(LEGACY_KEY)) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    offAuth();
    window.removeEventListener("storage", onStorage);
  };
}

function write(s: Saved): void {
  const key = keyNow();
  const raw = JSON.stringify(s);
  if (!useMemory) {
    try {
      window.localStorage.setItem(key, raw);
    } catch {
      useMemory = true;
    }
  }
  if (useMemory) memory.set(key, raw);
  listeners.forEach((l) => l());
}

export function readSaved(): Saved {
  return getSnapshot();
}

/** 화면에서 바꿀 때 — 시각을 새로 찍고, 서버로 올리기를 예약한다 */
export function updateSaved(fn: (s: Saved) => Omit<Saved, "updatedAt"> | Saved): Saved {
  const next = { ...fn(getSnapshot()), updatedAt: Date.now() };
  write(next);
  afterLocalWrite?.();
  return next;
}

/** 서버에서 받아 온 값으로 덮을 때 — 시각은 서버 값 그대로, 다시 올리지 않는다 */
export function replaceSaved(s: Saved): void {
  write(s);
}

/** lib/sync 가 '기기에서 바뀌면 알려 줘'를 건다 */
export function setAfterLocalWrite(fn: (() => void) | null): void {
  afterLocalWrite = fn;
}

export function useSaved(): Saved | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

function subscribeToday(cb: () => void): () => void {
  const id = window.setInterval(cb, 60_000);
  document.addEventListener("visibilitychange", cb);
  return () => {
    window.clearInterval(id);
    document.removeEventListener("visibilitychange", cb);
  };
}

/** 오늘 날짜(기기 시간) — 자정을 넘기거나 앱으로 돌아오면 바뀐다 */
export function useToday(): string {
  return useSyncExternalStore(subscribeToday, () => localDay(new Date()), () => "");
}
