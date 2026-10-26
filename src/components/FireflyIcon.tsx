import Image from "next/image";
import { imageOf } from "@/lib/assets";

const INK = "#3e3a52";

/** 모은 반딧불이 한 마리 — 숫자 옆·보상 화면에 쓴다. 힉스필드 그림(image-manifest "icon:firefly")이 있으면 그 그림 */
export function FireflyIcon({ size = 28, className = "" }: { size?: number; className?: string }) {
  const src = imageOf("icon:firefly");
  if (src) return <Image src={src} alt="" width={size} height={size} draggable={false} className={`pointer-events-none object-contain ${className}`} />;
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={className} aria-hidden>
      <circle cx="20" cy="27" r="14" fill="#ffe66b" opacity="0.45" />
      <ellipse cx="12" cy="15" rx="7" ry="5" fill="#e6f3ff" stroke="#bcdcf6" strokeWidth="1.2" transform="rotate(-25 12 15)" />
      <ellipse cx="28" cy="15" rx="7" ry="5" fill="#e6f3ff" stroke="#bcdcf6" strokeWidth="1.2" transform="rotate(25 28 15)" />
      <ellipse cx="20" cy="28" rx="7.5" ry="6.5" fill="#ffe46b" stroke="#f2c64a" strokeWidth="1.4" />
      <circle cx="20" cy="18.5" r="8" fill="#94dbb2" stroke="#5bb487" strokeWidth="1.4" />
      <circle cx="17" cy="18" r="1.5" fill={INK} />
      <circle cx="23" cy="18" r="1.5" fill={INK} />
    </svg>
  );
}
