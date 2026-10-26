"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { LETTER_FAMILY } from "@/app/fonts";
import { Icon } from "@/components/Icon";
import { PenCursor } from "@/components/PenCursor";
import { sfx } from "@/lib/sfx";
import { loadArt, stampArt } from "./art-canvas";
import { CRAYONS, Crayons, savePng, ToolButtons } from "./kit";

/*
 * 그림 판 — 아래 캔버스는 바탕(흰 종이 또는 카드 틀), 위 캔버스에 그린다.
 * 지우개는 위 캔버스만 지운다(카드 틀은 그대로). 스티커를 고르면 누른 자리에 콕 찍힌다.
 * 펜은 크레파스 · 반짝이(하얀 별이 뿌려진다) · 무지개(그리는 동안 색이 바뀐다). 손끝에는 고른 펜 그림이 따라다닌다.
 */

type Pen = "crayon" | "glitter" | "rainbow";
const PENS: { id: Pen; label: string; emoji: string }[] = [
  { id: "crayon", label: "크레파스", emoji: "🖍️" },
  { id: "glitter", label: "반짝이", emoji: "✨" },
  { id: "rainbow", label: "무지개", emoji: "🌈" },
];

/** 반짝이 — 작은 네 갈래 별 */
function twinkle(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.save();
  c.fillStyle = Math.random() < 0.65 ? "#ffffff" : "#fff3a8";
  c.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (Math.PI / 4) * k;
    const rr = k % 2 === 0 ? r : r * 0.32;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
  c.restore();
}

export interface CardBackground {
  message: string;
  emoji: string;
  tone: string;
}

const SIZES = [8, 16, 30];
const UNDO_MAX = 15;

async function paintCard(ctx: CanvasRenderingContext2D, w: number, h: number, card: CardBackground) {
  ctx.fillStyle = card.tone;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = h * 0.03;
  ctx.strokeRect(h * 0.04, h * 0.04, w - h * 0.08, h * 0.92);
  const family = LETTER_FAMILY;
  const size = Math.round(Math.min(h * 0.2, (w * 0.8) / Math.max(2, [...card.message].length)));
  await document.fonts.load(`900 ${size}px ${family}`, card.message).catch(() => undefined);
  ctx.font = `900 ${size}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.setLineDash([10, 9]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#9a80e2";
  ctx.fillStyle = "rgb(255 255 255 / 0.75)";
  ctx.fillText(card.message, w / 2, h * 0.3);
  ctx.strokeText(card.message, w / 2, h * 0.3);
  ctx.setLineDash([]);
  await loadArt(card.emoji);
  stampArt(ctx, card.emoji, w * 0.83, h * 0.76, h * 0.26);
  stampArt(ctx, card.emoji, w * 0.12, h * 0.14, h * 0.12);
}

export function DrawPad({ name, card, stickers, width, aspect = 4 / 3 }: { name: string; card?: CardBackground; stickers?: string[]; width: string; aspect?: number }) {
  const [color, setColor] = useState(CRAYONS[5]);
  const [size, setSize] = useState(1);
  const [eraser, setEraser] = useState(false);
  const [pen, setPen] = useState<Pen>("crayon");
  const [sticker, setSticker] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const undoStack = useRef<ImageData[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);
  // 무지개 펜 — 지나간 거리만큼 색이 돈다
  const hue = useRef(0);
  const cardKey = card ? `${card.message}|${card.emoji}|${card.tone}` : "";

  useEffect(() => {
    const box = boxRef.current;
    const bg = bgRef.current;
    const ink = inkRef.current;
    if (!box || !bg || !ink) return;
    const W = Math.floor(box.getBoundingClientRect().width);
    const H = Math.floor(W / aspect);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [bg, ink]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      c.style.width = `${W}px`;
      c.style.height = `${H}px`;
      c.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    undoStack.current = [];
    const bctx = bg.getContext("2d");
    if (!bctx) return;
    if (cardKey) {
      const [message, emoji, tone] = cardKey.split("|");
      void paintCard(bctx, W, H, { message, emoji, tone });
    } else {
      bctx.fillStyle = "#fff";
      bctx.fillRect(0, 0, W, H);
    }
  }, [cardKey, aspect]);

  // 스티커 그림은 미리 불러 둔다 — 누르는 순간 바로 찍히게
  useEffect(() => {
    for (const s of stickers ?? []) void loadArt(s);
  }, [stickers]);

  const ctx = () => inkRef.current?.getContext("2d", { willReadFrequently: true }) ?? null;

  const snapshot = () => {
    const c = ctx();
    const ink = inkRef.current;
    if (!c || !ink) return;
    undoStack.current.push(c.getImageData(0, 0, ink.width, ink.height));
    if (undoStack.current.length > UNDO_MAX) undoStack.current.shift();
  };

  const at = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const line = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const c = ctx();
    if (!c) return;
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const width = SIZES[size] * (eraser ? 1.6 : 1);
    c.globalCompositeOperation = eraser ? "destination-out" : "source-over";
    if (!eraser && pen === "rainbow") {
      hue.current = (hue.current + dist * 0.9) % 360;
      c.strokeStyle = `hsl(${hue.current} 85% 62%)`;
    } else c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(from.x, from.y);
    c.lineTo(to.x, to.y);
    c.stroke();
    c.globalCompositeOperation = "source-over";
    if (!eraser && pen === "glitter") {
      // 지나간 자리 둘레에 반짝이를 뿌린다
      const n = Math.max(1, Math.round(dist / 10));
      for (let k = 0; k < n; k++) {
        if (Math.random() < 0.4) continue;
        const t = Math.random();
        const a = Math.random() * Math.PI * 2;
        const rr = Math.random() * width * 0.9;
        twinkle(c, from.x + (to.x - from.x) * t + Math.cos(a) * rr, from.y + (to.y - from.y) * t + Math.sin(a) * rr, Math.max(4, width * 0.5));
      }
      if (Math.random() < 0.25) sfx.sparkle();
    }
  };

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = at(e);
    snapshot();
    if (sticker) {
      const c = ctx();
      const h = (inkRef.current?.getBoundingClientRect().height ?? 400) * 0.14;
      if (c) stampArt(c, sticker, p.x, p.y, h * 1.3);
      sfx.pop();
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = p;
    line(p, p);
  };

  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!last.current) return;
    const p = at(e);
    line(last.current, p);
    last.current = p;
  };

  const up = () => {
    last.current = null;
  };

  const undo = () => {
    const c = ctx();
    const img = undoStack.current.pop();
    if (!c || !img) return;
    sfx.tick();
    c.putImageData(img, 0, 0);
  };

  const clear = () => {
    const c = ctx();
    const ink = inkRef.current;
    if (!c || !ink) return;
    sfx.tick();
    snapshot();
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, ink.width, ink.height);
    c.restore();
  };

  return (
    <div className="flex flex-col items-center gap-4 short:flex-row short:gap-4">
      <div ref={boxRef} className="relative shrink-0 overflow-hidden rounded-[2.5rem] bg-card shadow-[0_8px_0_var(--paper-deep)]" style={{ width, aspectRatio: `${aspect} / 1` }}>
        <canvas ref={bgRef} className="absolute inset-0" />
        <canvas ref={inkRef} className="absolute inset-0 touch-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        {!eraser && !sticker && <PenCursor target={inkRef} tool={pen} />}
      </div>
      {/* 폰 가로에서는 도구가 판 옆으로 */}
      <div className="flex flex-col items-center gap-4 short:w-[30vw] short:gap-2">
      <div className="flex flex-wrap items-center justify-center gap-4 short:gap-2">
        <div className="flex gap-2" role="radiogroup" aria-label="펜">
          {PENS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={!eraser && !sticker && pen === p.id}
              onClick={() => {
                setPen(p.id);
                setEraser(false);
                setSticker(null);
                sfx.tick();
              }}
              className={`flex w-[4.6rem] flex-col items-center gap-0.5 rounded-[1.4rem] py-1.5 transition-transform short:w-[3.6rem] ${
                !eraser && !sticker && pen === p.id ? "scale-110 bg-card ring-4 ring-ink" : "bg-card/70"
              }`}
            >
              <span className="text-[2.6rem] leading-none short:text-[2rem]">
                <Icon id={`tool:${p.id}`} emoji={p.emoji} />
              </span>
              <span className="text-base short:text-sm">{p.label}</span>
            </button>
          ))}
        </div>
        <Crayons
          color={color}
          eraser={eraser}
          onPick={(c) => {
            setColor(c);
            setEraser(false);
            setSticker(null);
            if (pen === "rainbow") setPen("crayon");
            sfx.tick();
          }}
          onEraser={() => {
            setEraser(true);
            setSticker(null);
            sfx.tick();
          }}
        />
        <div className="flex items-center gap-2">
          {SIZES.map((s, i) => (
            <button
              key={s}
              type="button"
              aria-label={`굵기 ${i + 1}`}
              onClick={() => {
                setSize(i);
                setSticker(null);
                sfx.tick();
              }}
              className={`grid h-12 w-12 place-items-center rounded-full bg-card ${size === i && !sticker ? "ring-4 ring-ink" : ""}`}
            >
              <span className="rounded-full bg-ink" style={{ width: s * 0.9, height: s * 0.9 }} />
            </button>
          ))}
        </div>
        <ToolButtons onUndo={undo} onClear={clear} onSave={() => savePng([bgRef.current, inkRef.current], name)} />
      </div>
      {stickers && (
        <div className="flex flex-wrap justify-center gap-2">
          {stickers.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSticker(sticker === s ? null : s);
                sfx.tick();
              }}
              className={`grid h-14 w-14 place-items-center rounded-2xl bg-card text-3xl ${sticker === s ? "ring-4 ring-peach-deep" : ""}`}
            >
              <Icon emoji={s} />
            </button>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
