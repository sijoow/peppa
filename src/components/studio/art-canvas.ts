import { artOf } from "@/lib/assets";

/*
 * 캔버스에 이모지 자리 그림 찍기 — 스티커·카드 틀. 페파풍 그림이 있으면 그림, 없으면 이모지 글자.
 * 그림은 같은 사이트 주소("/cdn/…" 또는 "/img/…")라서 저장(PNG) 할 때 캔버스가 막히지 않는다.
 */

const loading = new Map<string, Promise<HTMLImageElement | null>>();
const ready = new Map<string, HTMLImageElement>();

export function loadArt(emoji: string): Promise<HTMLImageElement | null> {
  const known = loading.get(emoji);
  if (known) return known;
  const src = artOf(emoji, true);
  const p: Promise<HTMLImageElement | null> = src
    ? new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          ready.set(emoji, img);
          resolve(img);
        };
        img.onerror = () => resolve(null);
        img.src = src;
      })
    : Promise.resolve(null);
  loading.set(emoji, p);
  return p;
}

/** (x, y) 가운데에 크기 size 로 — 미리 불러 둔 그림이 없으면 이모지 글자 */
export function stampArt(ctx: CanvasRenderingContext2D, emoji: string, x: number, y: number, size: number): void {
  const img = ready.get(emoji);
  if (img) {
    const k = size / Math.max(img.naturalWidth, img.naturalHeight);
    const w = img.naturalWidth * k;
    const h = img.naturalHeight * k;
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    return;
  }
  ctx.font = `${Math.round(size)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, x, y);
}
