"use client";

import Image from "next/image";
import { useSyncExternalStore, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { FireflyIcon } from "@/components/FireflyIcon";
import { Icon } from "@/components/Icon";
import { Peppa } from "@/components/Peppa";
import { imageOf } from "@/lib/assets";
import { sfx } from "@/lib/sfx";
import { say } from "@/lib/voice";

const COMPACT = "(max-height: 520px)";
const PORTRAIT = "(orientation: portrait)";

/**
 * 높이가 낮은 화면(폰 가로)인지 — 페파·스피커처럼 크기를 숫자로 받는 것들이 쓴다.
 * 글씨·여백은 CSS 의 short: (globals.css) 로 바꾼다.
 */
export function useCompact(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(COMPACT);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(COMPACT).matches,
    () => false,
  );
}

/** 세로 화면인지 — px 로 크기를 받는 것(페파·스피커)을 세로에 맞출 때 */
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

export const TONES = ["peach", "butter", "mint", "sky", "lilac", "rose"] as const;
export type Tone = (typeof TONES)[number];

export function toneAt(i: number): Tone {
  return TONES[((i % TONES.length) + TONES.length) % TONES.length];
}

/** 말랑 버튼 색 — globals.css 의 .squish 가 --tone / --tone-deep 을 읽는다 */
export function toneStyle(t: Tone | "card"): CSSProperties {
  if (t === "card") return { "--tone": "var(--card)", "--tone-deep": "var(--card-deep)" } as CSSProperties;
  return { "--tone": `var(--${t})`, "--tone-deep": `var(--${t}-deep)` } as CSSProperties;
}

type SquishProps = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone | "card" };

export function SquishButton({ tone = "card", className = "", style, children, ...rest }: SquishProps) {
  return (
    <button type="button" {...rest} className={`squish font-display text-ink ${className}`} style={{ ...toneStyle(tone), ...style }}>
      {children}
    </button>
  );
}

export type UiIconName = "prev" | "next" | "play" | "record" | "stop" | "mic";

/**
 * 조작 아이콘 — ◀ ▶ ⏺ 같은 글자·이모지 대신 쓰는 같은 모양의 선 그림(기기마다 이모지 모양이 달라서).
 * 크기는 글자 크기(1em), 색은 글자색(currentColor)을 따른다.
 */
export function UiIcon({ name, className = "" }: { name: UiIconName; className?: string }) {
  const line = { viewBox: "0 0 24 24", width: "1em", height: "1em", "aria-hidden": true, className, fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const solid = { viewBox: "0 0 24 24", width: "1em", height: "1em", "aria-hidden": true, className, fill: "currentColor" } as const;
  switch (name) {
    case "prev":
      return (
        <svg {...line}>
          <path d="M15 5l-7 7 7 7" />
        </svg>
      );
    case "next":
      return (
        <svg {...line}>
          <path d="M9 5l7 7-7 7" />
        </svg>
      );
    case "play":
      return (
        <svg {...solid}>
          <path d="M8 5.6v12.8a1.1 1.1 0 0 0 1.7.92l9.9-6.4a1.1 1.1 0 0 0 0-1.84L9.7 4.68A1.1 1.1 0 0 0 8 5.6z" />
        </svg>
      );
    case "record":
      return (
        <svg {...solid}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
    case "stop":
      return (
        <svg {...solid}>
          <rect x="6" y="6" width="12" height="12" rx="3" />
        </svg>
      );
    case "mic":
      return (
        <svg {...line} strokeWidth={2.4}>
          <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
        </svg>
      );
  }
}

/** 시작 ▶ — 분홍 시작 버튼 안의 하얀 동그라미에 */
export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden>
      <path d="M8 5.6v12.8a1.1 1.1 0 0 0 1.7.92l9.9-6.4a1.1 1.1 0 0 0 0-1.84L9.7 4.68A1.1 1.1 0 0 0 8 5.6z" fill="currentColor" />
    </svg>
  );
}

export function SpeakerIcon({ size = 40 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 19h7l10-8v26l-10-8H8z" fill="currentColor" />
      <path d="M32 17c3 2 4.5 4.5 4.5 7s-1.5 5-4.5 7" />
      <path d="M37.5 11c5 3.5 7.5 8 7.5 13s-2.5 9.5-7.5 13" />
    </svg>
  );
}

/** 다시 듣기 — 누르면 그 말을 다시 들려준다 */
export function SpeakerButton({
  text,
  size = 88,
  tone = "sky",
  pulse = false,
  className = "",
}: {
  text: string | readonly string[];
  size?: number;
  tone?: Tone | "card";
  pulse?: boolean;
  className?: string;
}) {
  const px = useCompact() ? Math.round(size * 0.55) : size;
  return (
    <SquishButton
      tone={tone}
      aria-label="다시 듣기"
      className={`grid place-items-center rounded-full ${pulse ? "animate-breathe" : ""} ${className}`}
      style={{ width: px, height: px }}
      onClick={() => {
        sfx.wake();
        void say(text);
      }}
    >
      <SpeakerIcon size={px * 0.5} />
    </SquishButton>
  );
}

function Cloud({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 64" className={className} aria-hidden>
      <g fill="#fff">
        <circle cx="34" cy="38" r="18" />
        <circle cx="60" cy="27" r="23" />
        <circle cx="86" cy="38" r="17" />
        <rect x="30" y="36" width="60" height="22" rx="11" />
      </g>
    </svg>
  );
}

/** 페파 동화마을의 장소 — 메뉴마다 다른 바탕(힉스필드 "bg:<장소>") */
export type Scene = "home" | "play" | "free" | "missions" | "galaxy" | "reading" | "studio";

/** 바탕 — 장소 그림이 있으면 그 그림, 없으면 종이 점무늬 + 번진 파스텔 + 둥실 구름 */
export function Backdrop({ scene = "play" }: { scene?: Scene }) {
  const src = imageOf(`bg:${scene}`);
  if (src) {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image src={src} alt="" fill priority sizes="100vw" className="object-cover object-bottom" />
      </div>
    );
  }
  return (
    <div aria-hidden className="paper-dots pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-peach/35 blur-3xl" />
      <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-sky/40 blur-3xl" />
      <div className="absolute -bottom-36 left-1/3 h-96 w-96 rounded-full bg-mint/35 blur-3xl" />
      <Cloud className="absolute left-[6%] top-[14%] w-36 animate-float opacity-90" />
      <Cloud className="absolute right-[12%] top-[7%] w-24 animate-float opacity-80 [animation-delay:1.3s]" />
      <Cloud className="absolute bottom-[10%] right-[4%] w-28 animate-float opacity-70 [animation-delay:2.1s]" />
    </div>
  );
}

export function FireflyCount({ n, className = "" }: { n: number; className?: string }) {
  return (
    <div className={`glass flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1.5 pr-4 text-2xl font-extrabold portrait:gap-1 portrait:pr-3 portrait:text-xl ${className}`}>
      <FireflyIcon size={38} className="short:h-7 short:w-7 portrait:h-8 portrait:w-8" />
      <span className="tabular-nums">{n}</span>
    </div>
  );
}

/** 말풍선 — 꼬리가 페파 쪽(tail: 위/아래)을 가리킨다 */
export function SpeechBubble({ children, className = "", tail = "up" }: { children: ReactNode; className?: string; tail?: "up" | "down" }) {
  return (
    <div
      className={`relative rounded-[1.8rem] bg-white px-6 py-3.5 text-center text-[1.75rem] font-bold leading-snug text-balance break-keep text-ink shadow-[0_14px_34px_-14px_rgb(62_58_82/0.35)] ${className}`}
    >
      <span aria-hidden className={`absolute left-1/2 h-6 w-6 -translate-x-1/2 rotate-45 rounded-[0.35rem] bg-white ${tail === "up" ? "-top-2.5" : "-bottom-2.5"}`} />
      <span className="relative">{children}</span>
    </div>
  );
}

/**
 * 메뉴 카드 — 하얀 카드 + 색 그림 칸 + 굵은 제목(2026-10-26 새 화면). 놀이터·도전·우주 여행·책 읽기·그리기 목록이 같이 쓴다.
 * 잠겨 있으면 그림이 흐려지고 자물쇠와 열리는 조건(lockText). dark 는 밤하늘 위(우주 여행).
 */
export function MenuCard({
  tone,
  art,
  title,
  sub,
  locked = false,
  lockText,
  onClick,
  dark = false,
  className = "",
  artClassName = "",
  style,
  children,
}: {
  tone: Tone | "card";
  art: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  locked?: boolean;
  lockText?: ReactNode;
  onClick: () => void;
  dark?: boolean;
  className?: string;
  artClassName?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const artBg = locked ? (dark ? "rgb(255 255 255 / 0.06)" : "var(--paper-deep)") : dark ? "rgb(255 255 255 / 0.12)" : `var(--${tone === "card" ? "paper" : tone})`;
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`group relative flex min-h-0 flex-col items-stretch gap-1.5 rounded-[1.8rem] p-2 pb-2.5 text-center transition-transform duration-150 active:scale-95 ${
        dark ? "bg-white/10 text-white ring-1 ring-white/25 backdrop-blur-md" : "bg-white text-ink shadow-[0_14px_30px_-16px_rgb(62_58_82/0.45)]"
      } ${className}`}
    >
      <span className={`relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded-[1.4rem] ${artClassName}`} style={{ background: artBg }}>
        <span className={`grid place-items-center transition-transform duration-200 ${locked ? "opacity-40 grayscale" : "group-hover:-rotate-3 group-hover:scale-105"}`}>{art}</span>
        {locked && (
          <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-base shadow">
            <Icon emoji="🔒" />
          </span>
        )}
      </span>
      <span className="px-1 text-lg font-extrabold leading-tight break-keep">{title}</span>
      {sub && <span className={`-mt-0.5 px-1 text-sm font-semibold ${dark ? "text-white/75" : "text-ink-soft"}`}>{sub}</span>}
      {locked && lockText && (
        <span className={`mx-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${dark ? "bg-white/15 text-white/80" : "bg-paper text-ink-soft"}`}>{lockText}</span>
      )}
      {children}
    </button>
  );
}

/** 불러오는 동안 */
export function Splash() {
  return (
    <main className="relative grid h-dvh place-items-center overflow-hidden">
      <Backdrop scene="home" />
      <div className="relative flex flex-col items-center gap-4">
        <Peppa size={170} className="animate-float" />
        <p className="peppa-title text-center text-6xl leading-tight">
          하온이의
          <br />
          한글나라
        </p>
      </div>
    </main>
  );
}
