"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { LETTER_FAMILY } from "@/app/fonts";
import { PenCursor } from "@/components/PenCursor";

/*
 * 손글씨 판 — 글자·낱말·문장을 손가락으로 쓴다. 오늘의 모험 따라쓰기, 작업실 쓰기 연습, 자유 모드 쓰기 놀이가 같이 쓴다.
 *   trace  연한 글자 위를 따라 쓴다
 *   free   글자를 잠깐 보여 주고 숨긴다 — 혼자 쓴 글씨는 크기·자리가 제각각이라 글자 크기에 맞춰 늘려서 잰다
 * 잘 썼는지는 칸으로 잰다: 글자 칸을 얼마나 덮었나(cover) + 그린 선이 글자 근처에 있나(near).
 * 화면 전체를 마구 칠하면 near 가 낮아서 통과하지 않는다. 획순 안내는 아직 없다(획 자료가 생기면 붙인다).
 * 쓰는 동안 손끝에 연필 그림이 따라다닌다(components/PenCursor).
 */

const ROWS = 56; // 판 높이 방향 칸 수 (가로는 비율만큼)
const BRUSH = 0.09; // 판 높이에 대한 붓 굵기
const PASS = { trace: { cover: 0.6, near: 0.6 }, free: { cover: 0.42, near: 0.5 } };

interface Board {
  w: number;
  h: number;
  cols: number;
  body: Uint8Array;
  near: Uint8Array;
  ink: Uint8Array;
  last: { x: number; y: number } | null;
  drawing: boolean;
}

/** 글자를 판 한가운데에 — 넓으면 줄여서 맞춘다. 글자 잉크 상자 기준 */
function place(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, family: string) {
  let size = Math.round(h * 0.78);
  ctx.font = `700 ${size}px ${family}`;
  let m = ctx.measureText(text);
  const width = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  if (width > w * 0.9) {
    size = Math.floor((size * w * 0.9) / width);
    ctx.font = `700 ${size}px ${family}`;
    m = ctx.measureText(text);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const iw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const ih = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  return { x: (w - iw) / 2 + m.actualBoundingBoxLeft, y: (h - ih) / 2 + m.actualBoundingBoxAscent };
}

function maskOf(text: string, family: string, cols: number, grow: number): Uint8Array {
  const c = document.createElement("canvas");
  c.width = cols;
  c.height = ROWS;
  const ctx = c.getContext("2d");
  const out = new Uint8Array(cols * ROWS);
  if (!ctx) return out;
  const { x, y } = place(ctx, cols, ROWS, text, family);
  ctx.fillStyle = "#000";
  ctx.fillText(text, x, y);
  if (grow > 0) {
    ctx.lineWidth = grow;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.strokeText(text, x, y);
  }
  const data = ctx.getImageData(0, 0, cols, ROWS).data;
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] > 100 ? 1 : 0;
  return out;
}

function drawGuide(canvas: HTMLCanvasElement, w: number, h: number, text: string, family: string, state: "show" | "hide" | "done") {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (state === "hide") {
    // 혼자 쓰기 — 글자 대신 공책 칸만
    ctx.strokeStyle = "#ece6f8";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(w * 0.04, h / 2);
    ctx.lineTo(w * 0.96, h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  const { x, y } = place(ctx, w, h, text, family);
  ctx.fillStyle = state === "done" ? "#ffbaa8" : "#ece6f8";
  ctx.fillText(text, x, y);
  ctx.setLineDash(state === "done" ? [] : [10, 12]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = state === "done" ? "#ee8a70" : "#b9abe6";
  ctx.strokeText(text, x, y);
  ctx.setLineDash([]);
}

/** 혼자 쓴 글씨를 글자 상자 크기로 늘린다 — 자리·크기가 달라도 모양이 같으면 겹치게 */
function fitInk(b: Board): Uint8Array {
  const box = (m: Uint8Array) => {
    let x0 = b.cols;
    let y0 = ROWS;
    let x1 = -1;
    let y1 = -1;
    for (let i = 0; i < m.length; i++) {
      if (!m[i]) continue;
      const x = i % b.cols;
      const y = Math.floor(i / b.cols);
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    return x1 < 0 ? null : { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  };
  const ib = box(b.ink);
  const gb = box(b.body);
  const out = new Uint8Array(b.ink.length);
  if (!ib || !gb) return out;
  const r = Math.max(1, Math.round((ROWS * BRUSH) / 2));
  for (let i = 0; i < b.ink.length; i++) {
    if (!b.ink[i]) continue;
    const x = gb.x0 + (((i % b.cols) - ib.x0) * gb.w) / ib.w;
    const y = gb.y0 + ((Math.floor(i / b.cols) - ib.y0) * gb.h) / ib.h;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const cx = Math.round(x + dx);
        const cy = Math.round(y + dy);
        if (cx >= 0 && cy >= 0 && cx < b.cols && cy < ROWS && dx * dx + dy * dy <= r * r) out[cy * b.cols + cx] = 1;
      }
    }
  }
  return out;
}

export function TraceBoard({
  text,
  aspect = 1,
  mode = "trace",
  width,
  onSuccess,
}: {
  text: string;
  /** 가로 ÷ 세로 — 글자 1, 낱말 2~3, 문장 4~5 */
  aspect?: number;
  mode?: "trace" | "free";
  /** 판 가로 (CSS) */
  width: string;
  onSuccess: () => void;
}) {
  const [done, setDone] = useState(false);
  const [peek, setPeek] = useState(mode === "free");
  const boxRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const board = useRef<Board | null>(null);
  // 혼자 쓰기에서 안내 글자를 이미 숨겼는지 — 글꼴이 늦게 와도 다시 보이지 않게
  const hidden = useRef(false);
  const family = LETTER_FAMILY;

  // 글자가 바뀔 때마다 판을 새로 깐다 (부모가 key 로 새로 만들어도 된다)
  useEffect(() => {
    const box = boxRef.current;
    const guide = guideRef.current;
    const ink = inkRef.current;
    if (!box || !guide || !ink) return;
    let cancelled = false;
    const w = Math.floor(box.getBoundingClientRect().width);
    const h = Math.floor(w / aspect);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [guide, ink]) {
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      c.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    board.current = null;
    const cols = Math.round(ROWS * aspect);
    const paint = () => {
      if (cancelled) return;
      drawGuide(guide, w, h, text, family, hidden.current ? "hide" : "show");
      board.current = {
        w,
        h,
        cols,
        body: maskOf(text, family, cols, 0),
        near: maskOf(text, family, cols, ROWS * BRUSH * 1.4),
        ink: new Uint8Array(cols * ROWS),
        last: null,
        drawing: false,
      };
    };
    document.fonts.load(`700 ${Math.round(h * 0.78)}px ${family}`, text).then(paint, paint);
    return () => {
      cancelled = true;
    };
  }, [text, aspect, family]);

  // 혼자 쓰기 — 2.5초 보여 주고 숨긴다
  useEffect(() => {
    if (mode !== "free") return;
    const id = window.setTimeout(() => {
      hidden.current = true;
      const b = board.current;
      const guide = guideRef.current;
      if (b && guide) drawGuide(guide, b.w, b.h, text, family, "hide");
      setPeek(false);
    }, 2500);
    return () => window.clearTimeout(id);
  }, [mode, text, family]);

  const at = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const mark = (b: Board, p: { x: number; y: number }) => {
    const gx = (p.x / b.w) * b.cols;
    const gy = (p.y / b.h) * ROWS;
    const r = (ROWS * BRUSH) / 2;
    for (let y = Math.floor(gy - r); y <= Math.ceil(gy + r); y++) {
      for (let x = Math.floor(gx - r); x <= Math.ceil(gx + r); x++) {
        if (x < 0 || y < 0 || x >= b.cols || y >= ROWS) continue;
        if ((x + 0.5 - gx) ** 2 + (y + 0.5 - gy) ** 2 <= r * r) b.ink[y * b.cols + x] = 1;
      }
    }
  };

  const stroke = (b: Board, from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = inkRef.current?.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = "#ee8a70";
      ctx.lineWidth = b.h * BRUSH;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (b.h / ROWS / 2)));
    for (let i = 0; i <= steps; i++) mark(b, { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps });
  };

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    const b = board.current;
    if (!b || done || peek) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = at(e);
    b.drawing = true;
    b.last = p;
    stroke(b, p, p);
  };

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const b = board.current;
    if (!b?.drawing || !b.last) return;
    const p = at(e);
    stroke(b, b.last, p);
    b.last = p;
  };

  const up = () => {
    const b = board.current;
    if (!b?.drawing) return;
    b.drawing = false;
    b.last = null;
    const ink = mode === "free" ? fitInk(b) : b.ink;
    let body = 0;
    let covered = 0;
    let inked = 0;
    let near = 0;
    for (let i = 0; i < ink.length; i++) {
      if (b.body[i]) {
        body++;
        if (ink[i]) covered++;
      }
      if (ink[i]) {
        inked++;
        if (b.near[i]) near++;
      }
    }
    const pass = PASS[mode];
    if (body === 0 || covered / body < pass.cover || near / Math.max(1, inked) < pass.near) return;
    setDone(true);
    const guide = guideRef.current;
    if (guide) drawGuide(guide, b.w, b.h, text, family, "done");
    inkRef.current?.getContext("2d")?.clearRect(0, 0, b.w, b.h);
    onSuccess();
  };

  return (
    <div
      ref={boxRef}
      className={`relative rounded-[3rem] bg-card shadow-[0_8px_0_var(--paper-deep)] ${done ? "animate-wiggle" : ""}`}
      style={{ width, aspectRatio: `${aspect} / 1` }}
    >
      <canvas ref={guideRef} className="absolute inset-0" />
      <canvas ref={inkRef} className="absolute inset-0 touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      {!done && <PenCursor target={inkRef} tool="pencil" size={84} />}
      {peek && <span className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-butter px-4 py-1 text-xl">잘 보고 기억해!</span>}
      {done && <span className="pointer-events-none absolute -right-4 -top-4 grid h-20 w-20 animate-pop-in place-items-center rounded-full bg-mint-deep text-5xl text-white">✓</span>}
    </div>
  );
}

/**
 * 판 가로 — 화면 폭과 높이 둘 다에 맞춘다. reserveRem 은 판 말고 위아래에 놓일 것들의 높이(rem —
 * 폰 가로에서는 rem 이 작아져서 같이 줄어든다).
 */
export function boardWidth(aspect: number, maxVw: number, reserveRem: number): string {
  return `min(${maxVw}vw, 1150px, calc((100dvh - ${reserveRem}rem) * ${aspect}))`;
}

/** 지우기 — 판을 새로 만들면 지워진다(부모가 key 를 바꾼다) */
export function useBoardKey(): [number, () => void] {
  const [k, setK] = useState(0);
  return [k, () => setK((n) => n + 1)];
}
