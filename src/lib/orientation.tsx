"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { Orientation } from "@/lib/progress";
import { useSaved } from "@/lib/store";

/*
 * 화면 보기(세로 모드 · 가로 모드) — 부모 설정(settings.orientation, 처음엔 세로)대로 보이게 한다.
 *   설치한 앱(홈 화면 앱·TWA)  screen.orientation.lock 으로 바로 고정
 *   폰·태블릿 브라우저(웹 모바일)  브라우저는 전체 화면일 때만 방향을 고정해 준다 → 화면을 처음 누를 때 전체 화면 + 고정
 *     (2026-10-26 사용자: 한 번 정하면 다음부터 그 모드로 보이게 — 웹 모바일만)
 *   고정이 안 되는 기기(아이폰 사파리 등)는 방향이 다르면 "폰을 가로로 돌려 주세요" — 「이대로 볼래요」로 닫는다
 *   컴퓨터(마우스)는 건드리지 않는다
 */

type Lockable = ScreenOrientation & { lock?: (o: Orientation) => Promise<void> };

const PORTRAIT = "(orientation: portrait)";
const noop = () => () => undefined;

function installed(): boolean {
  return matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches;
}

/** 손가락으로 쓰는 기기의 브라우저 — 폰·태블릿 */
function mobileWeb(): boolean {
  return matchMedia("(pointer: coarse)").matches && !installed();
}

async function lock(o: Orientation): Promise<void> {
  const so = typeof screen === "undefined" ? undefined : (screen.orientation as Lockable | undefined);
  await so?.lock?.(o).catch(() => undefined);
}

/**
 * 이 방향으로 보이게 — 웹 모바일은 누르는 순간(사용자 동작) 안에서 불러야 전체 화면이 열린다.
 * 설치한 앱이면 바로 고정, 웹 모바일이면 전체 화면 → 고정, 컴퓨터는 그대로.
 */
export function lockOrientation(o: Orientation): void {
  if (typeof window === "undefined") return;
  if (installed()) {
    void lock(o);
    return;
  }
  if (!mobileWeb()) return;
  const el = document.documentElement;
  const full = document.fullscreenElement || !el.requestFullscreen ? Promise.resolve() : el.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
  void full.then(() => lock(o));
}

/** 지금 화면이 세로인지 — 판 모양처럼 숫자로 정해야 하는 것들이 쓴다(글씨·여백은 CSS portrait:) */
export function usePortrait(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(PORTRAIT);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(PORTRAIT).matches,
    () => false,
  );
}

/** 로그인한 동안 설정한 보기를 지킨다 — AuthGate 가 띄운다 */
export function OrientationBoot() {
  const saved = useSaved();
  const want = saved?.settings.orientation;
  const portrait = usePortrait();
  const mobile = useSyncExternalStore(noop, mobileWeb, () => false);
  const [keep, setKeep] = useState(false);

  // 설치한 앱은 사용자 동작 없이도 고정된다 — 켤 때와 설정이 바뀔 때
  useEffect(() => {
    if (want && installed()) void lock(want);
  }, [want]);

  // 웹 모바일 — 처음 누를 때 전체 화면 + 고정. 전체 화면에서 나왔는데 방향이 다르면 다음에 누를 때 다시
  useEffect(() => {
    if (!want || !mobile) return;
    let first = true;
    const onTap = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.("[data-keep-view]")) return;
      const wrong = window.matchMedia(PORTRAIT).matches !== (want === "portrait");
      if (!document.fullscreenElement && (first || wrong)) lockOrientation(want);
      first = false;
    };
    // 손가락은 pointerup 이 '사용자 동작'으로 쳐진다(pointerdown 은 아님)
    document.addEventListener("pointerup", onTap, true);
    return () => document.removeEventListener("pointerup", onTap, true);
  }, [want, mobile]);

  if (!want || !mobile || keep || portrait === (want === "portrait")) return null;
  const side = want === "portrait" ? "세로" : "가로";
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-paper/95 p-6 text-center">
      <style>{"@keyframes turn-phone{0%,15%{transform:rotate(0)}45%,70%{transform:rotate(var(--turn))}100%{transform:rotate(0)}}"}</style>
      <div className="flex flex-col items-center gap-5">
        <span
          aria-hidden
          className="grid h-32 w-20 place-items-center rounded-[1.4rem] border-[6px] border-ink bg-card text-4xl"
          style={{ animation: "turn-phone 2.4s ease-in-out infinite", ["--turn" as string]: want === "portrait" ? "-90deg" : "90deg" }}
        >
          🐷
        </span>
        <p className="text-3xl">화면을 누르면 {side} 모드로 바뀌어요</p>
        <p className="font-body text-lg text-ink-soft">안 바뀌면 폰을 {side}로 돌려 주세요</p>
        <button type="button" data-keep-view className="squish rounded-full bg-card px-6 py-3 text-xl" onClick={() => setKeep(true)}>
          이대로 볼래요
        </button>
      </div>
    </div>
  );
}
