"use client";

import { useEffect, useState } from "react";
import { PageArt } from "@/components/Art";
import { Icon } from "@/components/Icon";
import { LitChars, useReadAlong } from "@/components/ReadAlong";
import { SquishButton, UiIcon } from "@/components/ui";
import { bookOf } from "@/curriculum/books";
import { LINES } from "@/curriculum/lines";
import { sfx } from "@/lib/sfx";
import { useTimers } from "@/lib/useTimers";
import { say, stopVoice } from "@/lib/voice";
import type { OnDone } from "../types";

const COLORS = ["#ee8a70", "#58a8e6", "#4fbd90", "#9a80e2", "#ea8eb3", "#eeb43c"];

/** 낱말 하나를 읽을 때는 문장부호를 뗀다 */
const bare = (w: string) => w.replace(/[.,!?]/g, "");

/**
 * 오늘의 책 — 쪽마다 읽어 준다(토도 도서관의 '읽어주기').
 * 그림을 누르면 그 쪽을 다시, 낱말을 누르면 그 낱말만(토도의 '어절 탭 발음').
 * 읽어 주는 동안 읽는 곳까지 글자 색이 바뀐다(노래방 읽기).
 */
export function BookReader({ bookId, onDone }: { bookId: string; onDone: OnDone }) {
  const book = bookOf(bookId);
  const [page, setPage] = useState(0);
  const [word, setWord] = useState<number | null>(null);
  const [ending, setEnding] = useState(false);
  const later = useTimers();
  const lit = useReadAlong(book?.pages[page]?.text ?? "");

  useEffect(() => {
    if (book) void say([LINES.book, book.title, book.pages[0].text]);
    return () => stopVoice();
  }, [book]);

  if (!book) {
    return (
      <div className="grid h-full place-items-center">
        <SquishButton tone="mint" className="rounded-full px-10 py-5 text-4xl" onClick={() => onDone({ correct: 0, total: 0 })}>
          다음
        </SquishButton>
      </div>
    );
  }

  const last = book.pages.length - 1;
  const p = book.pages[page];

  const go = (n: number) => {
    sfx.pop();
    setPage(n);
    setWord(null);
    void say(book.pages[n].text);
  };

  const finish = () => {
    if (ending) return;
    setEnding(true);
    sfx.cheer();
    void say(LINES.bookEnd);
    later(() => onDone({ correct: 0, total: 0 }), 1800);
  };

  return (
    <div className="flex h-full items-center justify-center gap-5 px-5 pb-5 portrait:flex-wrap portrait:content-center portrait:gap-x-6 portrait:gap-y-4 portrait:px-3">
      <SquishButton tone="card" disabled={page === 0} onClick={() => go(page - 1)} className="grid h-24 w-24 shrink-0 place-items-center rounded-full text-4xl portrait:h-16 portrait:w-16 portrait:text-3xl" aria-label="앞쪽">
        <UiIcon name="prev" />
      </SquishButton>

      <div className="relative flex h-full max-h-[80vh] w-full max-w-5xl flex-col items-center justify-center gap-4 rounded-[3rem] border-[10px] border-card bg-[#fffdf8] px-8 shadow-[0_10px_0_var(--paper-deep)] portrait:order-first portrait:h-[72%] portrait:rounded-[2.2rem] portrait:border-[7px] portrait:px-4">
        <span className="absolute left-8 top-5 text-2xl text-ink-soft portrait:left-5 portrait:top-3 portrait:text-lg"><Icon emoji="📖" /> {book.title}</span>
        <button key={page} type="button" className="animate-pop-in" onClick={() => void say(p.text)} aria-label="이 쪽 다시 듣기">
          <PageArt art={p.art} imageKey={`book:${book.id}:${page}`} size="min(36vh, calc(30*var(--vw)))" color={COLORS[page % COLORS.length]} />
        </button>
        <p className="flex flex-wrap justify-center gap-x-5 gap-y-2 font-letter font-bold" style={{ fontSize: "min(9vh, calc(6.5*var(--vw)))" }}>
          {p.text.split(" ").map((w, i, all) => (
            <button
              key={`${page}-${i}`}
              type="button"
              className={`rounded-2xl px-2 transition-colors ${word === i ? "bg-butter" : ""}`}
              onClick={() => {
                setWord(i);
                void say(bare(w));
              }}
            >
              {/* 쪽 전체 글에서 이 낱말이 시작하는 자리 — 띄어쓰기 한 칸씩 */}
              <LitChars text={w} lit={lit} from={all.slice(0, i).reduce((n, x) => n + [...x].length + 1, 0)} />
            </button>
          ))}
        </p>
        <div className="absolute bottom-5 flex gap-2">
          {book.pages.map((_, i) => (
            <span key={i} className={`h-3 rounded-full ${i === page ? "w-8 bg-peach-deep" : "w-3 bg-paper-deep"}`} />
          ))}
        </div>
      </div>

      {page < last ? (
        <SquishButton tone="mint" onClick={() => go(page + 1)} className="grid h-24 w-24 shrink-0 place-items-center rounded-full text-4xl portrait:h-16 portrait:w-16 portrait:text-3xl" aria-label="다음 쪽">
          <UiIcon name="next" />
        </SquishButton>
      ) : (
        <SquishButton tone="peach" onClick={finish} className="h-24 shrink-0 whitespace-nowrap rounded-full px-6 text-3xl portrait:h-16">
          다 읽었어!
        </SquishButton>
      )}
    </div>
  );
}
