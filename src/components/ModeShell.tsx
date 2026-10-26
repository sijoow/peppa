"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { FireflyIcon } from "@/components/FireflyIcon";
import { Icon } from "@/components/Icon";
import { Peppa } from "@/components/Peppa";
import { Backdrop, FireflyCount, type Scene } from "@/components/ui";
import { usePlayClock } from "@/lib/play";
import { useSaved } from "@/lib/store";
import { stopVoice } from "@/lib/voice";

/**
 * 메뉴 화면 틀 — 왼쪽 위 돌아가기, 가운데 제목, 오른쪽 위 반딧불이. 보고 있는 시간은 리포트에 남는다.
 * onBack 이 있으면 그걸(놀이 → 목록), 없으면 첫 화면으로.
 */
export function ModeShell({
  title,
  icon,
  iconId,
  scene,
  onBack,
  backdrop,
  children,
}: {
  title: string;
  icon: string;
  /** 힉스필드 아이콘 이름(image-manifest "icon:<iconId>") — 그림이 있으면 이모지 대신 */
  iconId?: string;
  /** 페파 동화마을의 어느 장소인지 — 바탕 그림 */
  scene?: Scene;
  onBack?: () => void;
  /** 바탕을 직접 그릴 때 — 없으면 장소 그림 */
  backdrop?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const saved = useSaved();
  usePlayClock();
  return (
    <main className="relative flex h-dvh flex-col overflow-hidden">
      {backdrop ?? <Backdrop scene={scene} />}
      <header className="relative z-10 flex items-center justify-between gap-4 px-5 pt-4 portrait:gap-2 portrait:px-3 portrait:pt-3">
        <button
          type="button"
          className="glass grid h-14 w-14 shrink-0 place-items-center rounded-full text-3xl text-ink transition-transform active:scale-90 portrait:h-12 portrait:w-12 portrait:text-2xl"
          aria-label={onBack ? "뒤로" : "집으로"}
          onClick={() => {
            stopVoice();
            if (onBack) onBack();
            else router.push("/");
          }}
        >
          {onBack ? (
            <svg viewBox="0 0 24 24" width="0.9em" height="0.9em" aria-hidden fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          ) : (
            <Icon emoji="🏠" />
          )}
        </button>
        <div className="glass flex min-w-0 items-center gap-2 rounded-full px-6 py-2 text-3xl portrait:gap-1 portrait:px-4 portrait:text-2xl">
          <Icon id={iconId} emoji={icon} />
          <span className="peppa-title truncate">{title}</span>
        </div>
        <FireflyCount n={saved?.progress.fireflies ?? 0} />
      </header>
      <section className="relative z-0 min-h-0 flex-1">{children}</section>
    </main>
  );
}

/** 메뉴 안 놀이를 끝냈을 때 잠깐 보여 주는 칭찬 */
export function DoneBurst({ earned, text, onNext, nextLabel = "좋아!" }: { earned: number; text: string; onNext: () => void; nextLabel?: string }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-ink/25 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md animate-pop-in flex-col items-center gap-4 rounded-[2.4rem] bg-white px-10 pb-8 pt-6 shadow-[0_30px_60px_-20px_rgb(62_58_82/0.5)] portrait:px-6">
        <Peppa size={150} mood="cheer" />
        <p className="text-center text-4xl font-extrabold break-keep">{text}</p>
        {earned > 0 && (
          <p className="glass flex items-center gap-2 rounded-full px-5 py-1.5 text-2xl font-extrabold">
            <FireflyIcon size={34} /> +{earned}
          </p>
        )}
        <button type="button" className="cta mt-1 w-full rounded-full py-4 text-3xl font-extrabold" onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
