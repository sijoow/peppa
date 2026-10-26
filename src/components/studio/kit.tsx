"use client";

import { Icon } from "@/components/Icon";
import { SquishButton } from "@/components/ui";

/** 작업실 크레파스 — 아이가 고르기 쉬운 10색 (마지막은 하양 = 지우개 색) */
export const CRAYONS = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#38d9a9", "#4dabf7", "#5c7cfa", "#b197fc", "#f783ac", "#a9744f"];

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 크레파스 줄 */
export function Crayons({ color, onPick, eraser, onEraser }: { color: string; onPick: (c: string) => void; eraser?: boolean; onEraser?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {CRAYONS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`색 ${c}`}
          onClick={() => onPick(c)}
          className={`h-12 w-12 rounded-full border-4 transition-transform ${!eraser && color === c ? "scale-125 border-ink" : "border-white"}`}
          style={{ background: c, boxShadow: "0 4px 0 rgb(62 58 82 / 0.18)" }}
        />
      ))}
      {onEraser && (
        <button
          type="button"
          aria-label="지우개"
          onClick={onEraser}
          className={`grid h-12 w-12 place-items-center rounded-full border-4 bg-card text-2xl transition-transform ${eraser ? "scale-125 border-ink" : "border-white"}`}
          style={{ boxShadow: "0 4px 0 rgb(62 58 82 / 0.18)" }}
        >
          <Icon emoji="🧽" />
        </button>
      )}
    </div>
  );
}

/** 캔버스 여러 장(아래→위)을 한 장으로 합쳐 PNG 로 내려받는다 — TWA 앱에서는 기기 '다운로드'에 저장된다 */
export function savePng(layers: (HTMLCanvasElement | null)[], name: string): void {
  const base = layers.find((c) => c);
  if (!base) return;
  const out = document.createElement("canvas");
  out.width = base.width;
  out.height = base.height;
  const ctx = out.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  for (const c of layers) if (c) ctx.drawImage(c, 0, 0);
  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-${Date.now()}.png`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, "image/png");
}

/** 도구 줄 오른쪽 버튼들 */
export function ToolButtons({ onUndo, onClear, onSave }: { onUndo: () => void; onClear: () => void; onSave: () => void }) {
  return (
    <div className="flex gap-3">
      <SquishButton tone="card" className="h-14 rounded-full px-5 text-2xl" onClick={onUndo} aria-label="되돌리기">
        <Icon emoji="↩️" />
      </SquishButton>
      <SquishButton tone="card" className="h-14 rounded-full px-5 text-2xl" onClick={onClear} aria-label="모두 지우기">
        <Icon emoji="🗑️" />
      </SquishButton>
      <SquishButton tone="mint" className="h-14 rounded-full px-6 text-2xl" onClick={onSave}>
        <Icon emoji="💾" /> 저장
      </SquishButton>
    </div>
  );
}
