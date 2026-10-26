"use client";

import Image from "next/image";
import { useEffect, useRef, type RefObject } from "react";
import { imageOf } from "@/lib/assets";

/*
 * 손끝 펜 — 글씨를 쓰거나 그림을 그리는 동안 손가락 아래에 도구 그림(연필·크레파스·붓 …)이 따라다닌다.
 * 2026-10-26 사용자 요청: 글자를 따라 쓸 때 펜이 보이게. 도구 그림은 힉스필드 "icon:tool:<도구>"(펜 끝이 왼쪽 아래).
 * 판 캔버스(target)에 포인터 이벤트를 따로 걸어서 판의 그리기 코드는 건드리지 않는다.
 * 손가락이 펜 끝을 가려도 펜대는 오른쪽 위로 보인다. 마우스면 판 위에 올리기만 해도 보인다.
 */

export type PenTool = "pencil" | "crayon" | "brush" | "glitter" | "rainbow" | "bucket";

const FALLBACK: Record<PenTool, string> = { pencil: "✏️", crayon: "🖍️", brush: "🖌️", glitter: "✨", rainbow: "🌈", bucket: "🪣" };

/** 그림 안에서 펜 끝 자리(가로·세로 비율) — 물감통은 쏟아지는 물감이 가운데 아래 */
const TIP: Record<PenTool, [number, number]> = {
  pencil: [0.1, 0.9],
  crayon: [0.1, 0.9],
  brush: [0.12, 0.88],
  glitter: [0.14, 0.86],
  rainbow: [0.1, 0.9],
  bucket: [0.55, 0.85],
};

export function PenCursor({ target, tool, size = 72 }: { target: RefObject<HTMLCanvasElement | null>; tool: PenTool; size?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const src = imageOf(`icon:tool:${tool}`);

  useEffect(() => {
    const el = target.current;
    const pen = ref.current;
    if (!el || !pen) return;
    let down = false;
    const [tx, ty] = TIP[tool];
    const place = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - size * tx;
      const y = e.clientY - r.top - size * ty;
      pen.style.transform = `translate(${x}px, ${y}px)${down ? " rotate(-4deg)" : ""}`;
      pen.style.opacity = "1";
    };
    const hide = () => {
      pen.style.opacity = "0";
    };
    const onDown = (e: PointerEvent) => {
      down = true;
      place(e);
    };
    const onMove = (e: PointerEvent) => {
      if (down || e.pointerType === "mouse") place(e);
    };
    const onUp = (e: PointerEvent) => {
      down = false;
      if (e.pointerType === "mouse") place(e);
      else hide();
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", hide);
    el.addEventListener("pointerleave", hide);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", hide);
      el.removeEventListener("pointerleave", hide);
    };
  }, [target, tool, size]);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none absolute left-0 top-0 z-20 opacity-0 transition-opacity duration-150" style={{ width: size, height: size }}>
      {src ? (
        <Image src={src} alt="" fill sizes={`${size * 2}px`} className="object-contain drop-shadow-[0_4px_4px_rgb(62_58_82/0.25)]" draggable={false} />
      ) : (
        <span className="absolute bottom-0 left-0 leading-none" style={{ fontSize: size * 0.8 }}>
          {FALLBACK[tool]}
        </span>
      )}
    </div>
  );
}
