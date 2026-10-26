/**
 * 메뉴 공통 — 학습 시간·활동 수·반딧불이를 하루 리포트에 남기고, 메뉴·놀이가 열렸는지 본다.
 */

import { useEffect } from "react";
import type { Opens } from "@/curriculum/modes";
import { localDay, logPlay, reached, type DayStat } from "@/lib/progress";
import { updateSaved, type Saved } from "@/lib/store";

/** 하루 리포트에 더한다(반딧불이도 쌓인다) */
export function recordPlay(add: Partial<DayStat>): void {
  if (!add.ms && !add.acts && !add.earned) return;
  updateSaved((s) => ({ ...s, progress: logPlay(s.progress, localDay(new Date()), add) }));
}

/** 진도가 닿았거나 마스터 아이디면 열림 */
export function isOpen(saved: Saved, opens: Opens, master: boolean): boolean {
  return master || reached(saved.progress, opens.unit, opens.day);
}

const MAX_CHUNK = 30 * 60_000;

/**
 * 이 화면을 보고 있는 시간을 잰다 — 화면이 가려지면 멈추고, 1분마다·나갈 때 하루 리포트에 더한다.
 * (오늘의 모험은 시작~끝 시간을 따로 잰다)
 */
export function usePlayClock(): void {
  useEffect(() => {
    let since = document.visibilityState === "visible" ? Date.now() : 0;
    let acc = 0;
    const pause = () => {
      if (since) acc += Date.now() - since;
      since = 0;
    };
    const flush = () => {
      pause();
      if (acc >= 2000) recordPlay({ ms: Math.min(acc, MAX_CHUNK) });
      acc = 0;
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") since = Date.now();
      else flush();
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = window.setInterval(() => {
      if (!since) return;
      flush();
      since = Date.now();
    }, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
      flush();
    };
  }, []);
}
