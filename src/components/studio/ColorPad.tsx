"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { LETTER_FAMILY } from "@/app/fonts";
import { Icon } from "@/components/Icon";
import { PenCursor, type PenTool } from "@/components/PenCursor";
import { sfx } from "@/lib/sfx";
import { CRAYONS, Crayons, hexToRgb, savePng, ToolButtons } from "./kit";

/*
 * 색칠 판 — 선 그림(위 캔버스)과 칠(아래 캔버스)을 따로 둔다.
 * 그림을 처음 그릴 때 선으로 나뉜 칸마다 번호를 매겨 둔다. 도구(2026-10-26 사용자 요청 — 색만 칠하는 것보다 재미있게):
 *   채우기  누른 칸을 통째로 — 선 가장자리의 흐린 픽셀까지 칸에 들어가서 칠과 선 사이에 하얀 틈이 남지 않는다
 *   붓펜    손가락으로 칠한다 — 처음 누른 칸 밖으로는 안 나간다
 *   반짝이  붓펜처럼 칠하면서 하얀 반짝이가 뿌려진다
 *   무지개  칠하는 동안 색이 무지개처럼 바뀐다
 * 되돌리기는 한 번 칠한 만큼(채우기 한 번 · 붓질 한 번) — 바뀐 네모 칸만 저장한다.
 */

/** svg = 투명 바탕 선 그림 · image = 흰 바탕에 검은 선 그림(힉스필드 PNG) · glyph = 글자 */
export type ColorSource = { kind: "svg"; svg: string } | { kind: "image"; src: string } | { kind: "glyph"; text: string };

type RGB = [number, number, number];

type Tool = "fill" | "brush" | "glitter" | "rainbow";
const TOOLS: { id: Tool; pen: PenTool; label: string; emoji: string }[] = [
  { id: "fill", pen: "bucket", label: "채우기", emoji: "🪣" },
  { id: "brush", pen: "brush", label: "붓펜", emoji: "🖌️" },
  { id: "glitter", pen: "glitter", label: "반짝이", emoji: "✨" },
  { id: "rainbow", pen: "rainbow", label: "무지개", emoji: "🌈" },
];

/** 되돌리기 한 칸 — 바뀌기 전 네모 칸의 픽셀 */
interface Patch {
  x: number;
  y: number;
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

interface PadState {
  w: number;
  h: number;
  labels: Int32Array;
  fill: ImageData;
  history: Patch[];
}

/** 붓질 하나 — 처음 누른 칸(label) 안에서만 칠한다 */
interface Stroke {
  label: number;
  before: Uint8ClampedArray;
  box: [number, number, number, number];
  last: { x: number; y: number };
  travelled: number;
  stamps: number;
}

const UNDO_MAX = 20;

/** 선(불투명)이 아닌 픽셀을 이어진 칸끼리 번호 매기기 — 선은 -1 */
function labelRegions(alpha: Uint8ClampedArray, w: number, h: number): Int32Array {
  const lab = new Int32Array(w * h);
  for (let i = 0; i < w * h; i++) if (alpha[i * 4 + 3] > 110) lab[i] = -1;
  let next = 1;
  const stack: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (lab[start] !== 0) continue;
    const id = next++;
    lab[start] = id;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop() as number;
      const x = p % w;
      if (x > 0 && lab[p - 1] === 0) {
        lab[p - 1] = id;
        stack.push(p - 1);
      }
      if (x < w - 1 && lab[p + 1] === 0) {
        lab[p + 1] = id;
        stack.push(p + 1);
      }
      if (p >= w && lab[p - w] === 0) {
        lab[p - w] = id;
        stack.push(p - w);
      }
      if (p + w < w * h && lab[p + w] === 0) {
        lab[p + w] = id;
        stack.push(p + w);
      }
    }
  }
  return lab;
}

/** 칸 하나를 통째로 칠하고, 칠한 네모 칸을 돌려준다 */
function paintRegion(s: PadState, label: number, rgb: RGB): [number, number, number, number] {
  const d = s.fill.data;
  let x0 = s.w;
  let y0 = s.h;
  let x1 = -1;
  let y1 = -1;
  for (let i = 0; i < s.labels.length; i++) {
    if (s.labels[i] !== label) continue;
    d[i * 4] = rgb[0];
    d[i * 4 + 1] = rgb[1];
    d[i * 4 + 2] = rgb[2];
    d[i * 4 + 3] = 255;
    const x = i % s.w;
    const y = (i - x) / s.w;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

/** data 에서 네모 칸만 떼어 낸다 */
function cut(data: Uint8ClampedArray, w: number, [x0, y0, x1, y1]: [number, number, number, number]): Patch {
  const pw = x1 - x0 + 1;
  const ph = y1 - y0 + 1;
  const out = new Uint8ClampedArray(pw * ph * 4);
  for (let y = 0; y < ph; y++) out.set(data.subarray(((y0 + y) * w + x0) * 4, ((y0 + y) * w + x0 + pw) * 4), y * pw * 4);
  return { x: x0, y: y0, w: pw, h: ph, data: out };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** 붓 한 번 콕 — 칸 밖은 건너뛴다. 반짝이는 성글게 칠하고 하얀 반짝이를 뿌린다 */
function stamp(s: PadState, st: Stroke, cx: number, cy: number, r: number, rgb: RGB, tool: Tool) {
  const d = s.fill.data;
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(s.w - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(s.h - 1, Math.ceil(cy + r));
  const set = (i: number, c: RGB) => {
    d[i * 4] = c[0];
    d[i * 4 + 1] = c[1];
    d[i * 4 + 2] = c[2];
    d[i * 4 + 3] = 255;
  };
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      const i = y * s.w + x;
      if (s.labels[i] !== st.label) continue;
      if (tool === "glitter" && Math.random() < 0.5) continue;
      set(i, rgb);
    }
  }
  if (tool === "glitter") {
    // 반짝이 — 작은 십자(하양·연노랑) 몇 개
    for (let k = 0; k < 3; k++) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.random() * r;
      const sx = Math.round(cx + Math.cos(a) * rr);
      const sy = Math.round(cy + Math.sin(a) * rr);
      const c: RGB = Math.random() < 0.6 ? [255, 255, 255] : [255, 244, 170];
      const arm = Math.max(1, Math.round(r * 0.12));
      for (let t = -arm; t <= arm; t++) {
        for (const [px, py] of [
          [sx + t, sy],
          [sx, sy + t],
        ]) {
          if (px < 0 || py < 0 || px >= s.w || py >= s.h) continue;
          const i = py * s.w + px;
          if (s.labels[i] === st.label) set(i, c);
        }
      }
    }
  }
  const b = st.box;
  if (x0 < b[0]) b[0] = x0;
  if (y0 < b[1]) b[1] = y0;
  if (x1 > b[2]) b[2] = x1;
  if (y1 > b[3]) b[3] = y1;
}

async function drawSource(ctx: CanvasRenderingContext2D, w: number, h: number, src: ColorSource) {
  if (src.kind === "svg") {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src.svg)}`;
    await img.decode();
    const scale = Math.min((w * 0.94) / img.width, (h * 0.94) / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    return;
  }
  if (src.kind === "image") {
    const img = new Image();
    img.src = src.src;
    await img.decode();
    const scale = Math.min((w * 0.94) / img.naturalWidth, (h * 0.94) / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    // 어두운 픽셀만 선으로 남기고 흰 바탕은 비운다 — 칸 나누기(labelRegions)는 불투명한 픽셀을 선으로 본다
    const { width, height } = ctx.canvas;
    const px = ctx.getImageData(0, 0, width, height);
    const d = px.data;
    for (let i = 0; i < d.length; i += 4) {
      const dark = d[i + 3] > 0 && 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < 150;
      if (dark) {
        d[i] = 62;
        d[i + 1] = 58;
        d[i + 2] = 82;
        d[i + 3] = 255;
      } else d[i + 3] = 0;
    }
    ctx.putImageData(px, 0, 0);
    return;
  }
  const family = LETTER_FAMILY;
  const size = Math.round(h * 0.82);
  await document.fonts.load(`900 ${size}px ${family}`, src.text).catch(() => undefined);
  ctx.font = `900 ${size}px ${family}`;
  const m = ctx.measureText(src.text);
  const iw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const ih = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  ctx.lineWidth = Math.max(4, h * 0.016);
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#3e3a52";
  ctx.strokeText(src.text, (w - iw) / 2 + m.actualBoundingBoxLeft, (h - ih) / 2 + m.actualBoundingBoxAscent);
}

export function ColorPad({ source, name, aspect = 4 / 3, width }: { source: ColorSource; name: string; aspect?: number; width: string }) {
  const [color, setColor] = useState(CRAYONS[0]);
  const [tool, setTool] = useState<Tool>("fill");
  const [ready, setReady] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLCanvasElement>(null);
  const lineRef = useRef<HTMLCanvasElement>(null);
  const pad = useRef<PadState | null>(null);
  const stroke = useRef<Stroke | null>(null);
  const srcKey = source.kind === "svg" ? source.svg : source.kind === "image" ? source.src : source.text;

  useEffect(() => {
    const box = boxRef.current;
    const fill = fillRef.current;
    const line = lineRef.current;
    if (!box || !fill || !line) return;
    let cancelled = false;
    const W = Math.floor(box.getBoundingClientRect().width);
    const H = Math.floor(W / aspect);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [fill, line]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      c.style.width = `${W}px`;
      c.style.height = `${H}px`;
    }
    const lctx = line.getContext("2d");
    const fctx = fill.getContext("2d", { willReadFrequently: true });
    if (!lctx || !fctx) return;
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const src: ColorSource =
      source.kind === "svg" ? { kind: "svg", svg: srcKey } : source.kind === "image" ? { kind: "image", src: srcKey } : { kind: "glyph", text: srcKey };
    void drawSource(lctx, W, H, src).then(() => {
      if (cancelled) return;
      const labels = labelRegions(lctx.getImageData(0, 0, line.width, line.height).data, line.width, line.height);
      fctx.fillStyle = "#fff";
      fctx.fillRect(0, 0, fill.width, fill.height);
      pad.current = { w: fill.width, h: fill.height, labels, fill: fctx.getImageData(0, 0, fill.width, fill.height), history: [] };
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [source.kind, srcKey, aspect]);

  /** 바뀐 네모 칸만 다시 그린다 */
  const redraw = (x = 0, y = 0, w?: number, h?: number) => {
    const s = pad.current;
    const ctx = fillRef.current?.getContext("2d");
    if (s && ctx) ctx.putImageData(s.fill, 0, 0, x, y, w ?? s.w, h ?? s.h);
  };

  const remember = (p: Patch) => {
    const s = pad.current;
    if (!s) return;
    s.history.push(p);
    if (s.history.length > UNDO_MAX) s.history.shift();
  };

  /** 화면 좌표 → 캔버스 픽셀. 선 위를 눌렀으면 가까운 칸 */
  const locate = (e: PointerEvent<HTMLCanvasElement>) => {
    const s = pad.current;
    if (!s) return null;
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) * s.w) / r.width);
    const y = Math.floor(((e.clientY - r.top) * s.h) / r.height);
    let label = s.labels[y * s.w + x] ?? -1;
    for (let rad = 1; label <= 0 && rad <= 12; rad++) {
      for (const [dx, dy] of [[rad, 0], [-rad, 0], [0, rad], [0, -rad]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= s.w || ny >= s.h) continue;
        const l = s.labels[ny * s.w + nx];
        if (l > 0) {
          label = l;
          break;
        }
      }
    }
    return { x, y, label };
  };

  const brushRadius = () => Math.max(6, (pad.current?.h ?? 600) * 0.028);

  const colorFor = (st: Stroke): RGB => (tool === "rainbow" ? hslToRgb((st.travelled * 0.5) % 360, 0.85, 0.62) : hexToRgb(color));

  /** 붓 자국을 지난 자리 → to 로 촘촘히 */
  const brushTo = (st: Stroke, to: { x: number; y: number }) => {
    const s = pad.current;
    if (!s) return;
    const r = brushRadius();
    const dist = Math.hypot(to.x - st.last.x, to.y - st.last.y);
    const steps = Math.max(1, Math.ceil(dist / (r * 0.45)));
    const whole = st.box;
    st.box = [s.w, s.h, -1, -1];
    for (let i = 1; i <= steps; i++) {
      const x = st.last.x + ((to.x - st.last.x) * i) / steps;
      const y = st.last.y + ((to.y - st.last.y) * i) / steps;
      st.travelled += dist / steps;
      stamp(s, st, x, y, r, colorFor(st), tool);
      st.stamps++;
      if (tool === "glitter" && st.stamps % 9 === 0) sfx.sparkle();
    }
    const [x0, y0, x1, y1] = st.box;
    if (x1 >= x0) redraw(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    // 붓질 전체 네모 칸 — 되돌리기용
    st.box = [Math.min(whole[0], x0), Math.min(whole[1], y0), Math.max(whole[2], x1), Math.max(whole[3], y1)];
    st.last = to;
  };

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    const s = pad.current;
    const hit = locate(e);
    if (!s || !hit || hit.label <= 0) return;
    if (tool === "fill") {
      const snap = s.fill.data.slice();
      const box = paintRegion(s, hit.label, hexToRgb(color));
      remember(cut(snap, s.w, box));
      redraw(box[0], box[1], box[2] - box[0] + 1, box[3] - box[1] + 1);
      sfx.pop();
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    sfx.pop();
    const st: Stroke = { label: hit.label, before: s.fill.data.slice(), box: [s.w, s.h, -1, -1], last: { x: hit.x, y: hit.y }, travelled: 0, stamps: 0 };
    stroke.current = st;
    brushTo(st, { x: hit.x, y: hit.y });
  };

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const st = stroke.current;
    const s = pad.current;
    if (!st || !s) return;
    const r = e.currentTarget.getBoundingClientRect();
    brushTo(st, { x: ((e.clientX - r.left) * s.w) / r.width, y: ((e.clientY - r.top) * s.h) / r.height });
  };

  const up = () => {
    const st = stroke.current;
    const s = pad.current;
    stroke.current = null;
    if (!st || !s || st.box[2] < st.box[0]) return;
    remember(cut(st.before, s.w, st.box));
  };

  const undo = () => {
    const s = pad.current;
    const last = s?.history.pop();
    if (!s || !last) return;
    sfx.tick();
    for (let y = 0; y < last.h; y++) s.fill.data.set(last.data.subarray(y * last.w * 4, (y + 1) * last.w * 4), ((last.y + y) * s.w + last.x) * 4);
    redraw(last.x, last.y, last.w, last.h);
  };

  const clear = () => {
    const s = pad.current;
    if (!s) return;
    sfx.tick();
    remember(cut(s.fill.data.slice(), s.w, [0, 0, s.w - 1, s.h - 1]));
    s.fill.data.fill(255);
    redraw();
  };

  const pen = TOOLS.find((t) => t.id === tool)?.pen ?? "brush";

  return (
    <div className="flex flex-col items-center gap-4 short:flex-row short:gap-4">
      <div ref={boxRef} className="relative shrink-0 overflow-hidden rounded-[2.5rem] bg-card shadow-[0_8px_0_var(--paper-deep)]" style={{ width, aspectRatio: `${aspect} / 1` }}>
        <canvas ref={fillRef} className="absolute inset-0" />
        <canvas ref={lineRef} className="absolute inset-0 touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        <PenCursor target={lineRef} tool={pen} />
        {!ready && <span className="absolute inset-0 grid place-items-center text-2xl text-ink-soft">그림 준비 중…</span>}
      </div>
      {/* 폰 가로에서는 도구가 판 옆으로 */}
      <div className="flex flex-wrap items-center justify-center gap-4 short:w-[30vw] short:flex-col short:gap-2">
        <div className="flex gap-2" role="radiogroup" aria-label="칠하는 도구">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={tool === t.id}
              onClick={() => {
                setTool(t.id);
                sfx.tick();
              }}
              className={`flex w-[4.6rem] flex-col items-center gap-0.5 rounded-[1.4rem] py-1.5 transition-transform short:w-[3.6rem] ${
                tool === t.id ? "scale-110 bg-card ring-4 ring-ink" : "bg-card/70"
              }`}
            >
              <span className="text-[2.6rem] leading-none short:text-[2rem]">
                <Icon id={`tool:${t.pen}`} emoji={t.emoji} />
              </span>
              <span className="text-base short:text-sm">{t.label}</span>
            </button>
          ))}
        </div>
        <Crayons
          color={color}
          onPick={(c) => {
            setColor(c);
            if (tool === "rainbow") setTool("brush");
            sfx.tick();
          }}
        />
        <ToolButtons onUndo={undo} onClear={clear} onSave={() => savePng([fillRef.current, lineRef.current], name)} />
      </div>
    </div>
  );
}
