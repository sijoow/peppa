import { useCallback, useEffect, useRef } from "react";

/** 화면이 사라지면 같이 지워지는 setTimeout — 활동이 바뀐 뒤 옛 타이머가 끼어들지 않게 */
export function useTimers(): (fn: () => void, ms: number) => void {
  const ref = useRef<number[]>([]);
  useEffect(() => {
    const list = ref.current;
    return () => {
      list.forEach((t) => window.clearTimeout(t));
      list.length = 0;
    };
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    ref.current.push(window.setTimeout(fn, ms));
  }, []);
}
