"use client";

import { useEffect, useRef, useState } from "react";
import { PageArt } from "@/components/Art";
import { Icon } from "@/components/Icon";
import { Peppa } from "@/components/Peppa";
import { ModeShell } from "@/components/ModeShell";
import { LitChars, useReadAlong } from "@/components/ReadAlong";
import { MenuCard, SpeakerButton, SquishButton, toneAt, UiIcon, usePortrait } from "@/components/ui";
import { BOOKS, bookOf } from "@/curriculum/books";
import { LINES } from "@/curriculum/lines";
import { menuOf } from "@/curriculum/menus";
import type { Book } from "@/curriculum/types";
import { useAuth } from "@/lib/auth";
import { recordPlay } from "@/lib/play";
import { hangulOnly, scoreReading } from "@/lib/readingScore";
import { clipKey, loadClip, recordedPages, saveClip } from "@/lib/recordings";
import { sfx } from "@/lib/sfx";
import { pick, say, stopVoice } from "@/lib/voice";

/*
 * 읽기 연습 — 토도한글과 같은 두 가지.
 *   페파의 읽기 코칭   페파가 먼저 읽어 주고, 아이가 소리 내어 읽으면 기기 음성 인식으로 판정(너그럽게 60%)
 *   또박또박 책 녹음   쪽마다 아이 목소리를 녹음해서 '내 목소리 책'으로 듣는다 — 녹음은 이 기기에만
 * 마이크는 보안 주소(https·localhost)에서만 켜진다.
 */

const COLORS = ["#ee8a70", "#58a8e6", "#4fbd90", "#9a80e2", "#ea8eb3", "#eeb43c"];

interface RecogResult {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface Recog {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  abort(): void;
  onresult: ((e: RecogResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

function makeRecognizer(): Recog | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recog; webkitSpeechRecognition?: new () => Recog };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? new C() : null;
}

/** 책 한 쪽 — 페파가 읽어 주는 동안 읽는 곳까지 글자 색이 바뀐다(노래방 읽기) */
function PageView({ book, page, missing }: { book: Book; page: number; missing: string[] }) {
  const p = book.pages[page];
  const lit = useReadAlong(p.text);
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-3 rounded-[3rem] border-[10px] border-card bg-[#fffdf8] px-8 py-6 shadow-[0_10px_0_var(--paper-deep)]">
      <span className="self-start text-xl text-ink-soft">
        <Icon emoji="📖" /> {book.title} · {page + 1}/{book.pages.length}
      </span>
      <PageArt art={p.art} imageKey={`book:${book.id}:${page}`} size="min(26vh, calc(22*var(--vw)))" color={COLORS[page % COLORS.length]} />
      <p className="flex flex-wrap justify-center gap-x-4 font-letter font-bold" style={{ fontSize: "min(8vh, calc(6*var(--vw)))" }}>
        {p.text.split(" ").map((w, i, all) => (
          <span key={i} className={`rounded-2xl px-2 ${missing.includes(hangulOnly(w)) ? "bg-peach/60" : ""}`}>
            <LitChars text={w} lit={lit} from={all.slice(0, i).reduce((n, x) => n + [...x].length + 1, 0)} />
          </span>
        ))}
      </p>
    </div>
  );
}

/** 페파의 읽기 코칭 */
function Coach({ book, onFinish }: { book: Book; onFinish: () => void }) {
  const [page, setPage] = useState(0);
  const [phase, setPhase] = useState<"idle" | "listening" | "good" | "again">("idle");
  const [missing, setMissing] = useState<string[]>([]);
  const [supported] = useState(() => makeRecognizer() !== null);
  const rec = useRef<Recog | null>(null);
  const text = book.pages[page].text;

  useEffect(() => {
    void say([LINES.coachIntro, book.pages[0].text]);
    return () => {
      stopVoice();
      rec.current?.abort();
    };
  }, [book]);

  const listen = () => {
    const r = makeRecognizer();
    if (!r || phase === "listening") return;
    stopVoice();
    sfx.tick();
    r.lang = "ko-KR";
    r.interimResults = false;
    r.maxAlternatives = 5;
    r.continuous = false;
    r.onresult = (e) => {
      const alts = Array.from(e.results[0] ?? [], (a) => a.transcript);
      const s = scoreReading(text, alts);
      setMissing(s.missing);
      if (s.pass) {
        setPhase("good");
        sfx.cheer();
        void say(LINES.coachGood);
      } else {
        setPhase("again");
        sfx.boop();
        void say([LINES.coachAgain, text]);
      }
    };
    r.onerror = () => {
      setPhase("again");
      void say(LINES.coachAgain);
    };
    r.onend = () => setPhase((ph) => (ph === "listening" ? "idle" : ph));
    rec.current = r;
    setPhase("listening");
    r.start();
  };

  const next = () => {
    sfx.pop();
    if (page + 1 >= book.pages.length) {
      onFinish();
      return;
    }
    setPage(page + 1);
    setPhase("idle");
    setMissing([]);
    void say(book.pages[page + 1].text);
  };

  return (
    <div className="flex h-full flex-col items-center justify-evenly gap-3 px-6 pb-4">
      <PageView book={book} page={page} missing={missing} />
      {!supported && <p className="rounded-full bg-butter px-6 py-2 font-body text-xl">이 기기는 소리 판정을 못 해요 — &lsquo;또박또박 책 녹음&rsquo;으로 읽어 보세요</p>}
      <div className="flex items-center gap-6">
        <SpeakerButton text={text} size={88} />
        <SquishButton
          tone={phase === "listening" ? "peach" : "rose"}
          disabled={!supported}
          className={`grid h-32 w-32 place-items-center rounded-full text-6xl ${phase === "listening" ? "animate-breathe" : ""}`}
          onClick={listen}
          aria-label="읽기"
        >
          <span className="grid h-20 w-20 place-items-center rounded-full bg-white text-5xl text-rose-deep">
            <UiIcon name="mic" />
          </span>
        </SquishButton>
        <SquishButton tone={phase === "good" ? "mint" : "card"} className="flex h-20 items-center gap-2 rounded-full px-8 text-3xl" onClick={next}>
          {page + 1 >= book.pages.length ? (
            "다 읽었어!"
          ) : (
            <>
              다음 <UiIcon name="next" />
            </>
          )}
        </SquishButton>
      </div>
      <p className="h-10 text-3xl">{phase === "listening" ? "듣고 있어요…" : phase === "good" ? <><Icon emoji="⭐" /> 잘 읽었어!</> : phase === "again" ? "한 번 더!" : ""}</p>
    </div>
  );
}

/** 또박또박 책 녹음 */
function Recorder({ book, user, onFinish }: { book: Book; user: string; onFinish: () => void }) {
  const [page, setPage] = useState(0);
  const [have, setHave] = useState<number[]>([]);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    void say(LINES.recordIntro);
    void recordedPages(user, book.id, book.pages.length).then((pages) => {
      if (alive) setHave(pages);
    });
    return () => {
      alive = false;
      stopVoice();
      mr.current?.stop();
      audio.current?.pause();
    };
  }, [book, user]);

  const start = async () => {
    setError(null);
    stopVoice();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        await saveClip(clipKey(user, book.id, page), blob);
        setHave((h) => [...new Set([...h, page])]);
        sfx.ding();
      };
      mr.current = rec;
      rec.start();
      setRecording(true);
      sfx.tick();
    } catch {
      setError("마이크를 쓸 수 없어요. 마이크 허락을 확인해 주세요 (보안 주소에서만 돼요).");
    }
  };

  const stop = () => {
    mr.current?.stop();
    mr.current = null;
    setRecording(false);
  };

  const play = async (p: number): Promise<void> => {
    const blob = await loadClip(clipKey(user, book.id, p));
    if (!blob) return;
    audio.current?.pause();
    const a = new Audio(URL.createObjectURL(blob));
    audio.current = a;
    await new Promise<void>((resolve) => {
      a.onended = () => resolve();
      a.onerror = () => resolve();
      a.play().catch(() => resolve());
    });
  };

  const playBook = async () => {
    stopVoice();
    for (let p = 0; p < book.pages.length; p++) {
      if (!have.includes(p)) continue;
      setPage(p);
      await play(p);
    }
    if (have.length === book.pages.length) {
      sfx.cheer();
      void say(LINES.recordDone);
      onFinish();
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-evenly gap-3 px-6 pb-4">
      <PageView book={book} page={page} missing={[]} />
      {error && <p className="rounded-full bg-butter px-6 py-2 font-body text-xl">{error}</p>}
      <div className="flex items-center gap-5">
        <SquishButton tone="card" disabled={page === 0 || recording} className="grid h-20 w-20 place-items-center rounded-full text-4xl" onClick={() => setPage(page - 1)} aria-label="앞쪽">
          <UiIcon name="prev" />
        </SquishButton>
        <SquishButton
          tone={recording ? "peach" : "rose"}
          className={`grid h-32 w-32 place-items-center rounded-full ${recording ? "animate-breathe" : ""}`}
          onClick={() => (recording ? stop() : void start())}
          aria-label={recording ? "녹음 멈추기" : "녹음"}
        >
          {/* 하얀 동그라미 안에 빨간 점(녹음) · 네모(멈춤) */}
          <span className="grid h-20 w-20 place-items-center rounded-full bg-white text-[3.2rem] text-[#e5484d]">
            <UiIcon name={recording ? "stop" : "record"} />
          </span>
        </SquishButton>
        <SquishButton tone="sky" disabled={!have.includes(page) || recording} className="flex h-20 items-center gap-2 rounded-full px-6 text-2xl" onClick={() => void play(page)}>
          <UiIcon name="play" /> 내 목소리
        </SquishButton>
        <SquishButton tone="card" disabled={page + 1 >= book.pages.length || recording} className="grid h-20 w-20 place-items-center rounded-full text-4xl" onClick={() => setPage(page + 1)} aria-label="다음 쪽">
          <UiIcon name="next" />
        </SquishButton>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {book.pages.map((_, i) => (
            <span key={i} className={`h-4 w-4 rounded-full ${have.includes(i) ? "bg-mint-deep" : "bg-paper-deep"} ${i === page ? "ring-4 ring-ink/30" : ""}`} />
          ))}
        </div>
        <SquishButton tone="mint" disabled={have.length === 0 || recording} className="rounded-full px-6 py-3 text-2xl" onClick={() => void playBook()}>
          <Icon emoji="📼" /> 내 목소리 책 듣기
        </SquishButton>
      </div>
    </div>
  );
}

export default function ReadingScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<"coach" | "record" | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const portrait = usePortrait();

  useEffect(() => {
    void say(LINES.reading);
    return () => stopVoice();
  }, []);

  const book = bookId ? bookOf(bookId) : undefined;
  const finish = () => recordPlay({ acts: 1 });

  if (mode && book) {
    return (
      <ModeShell title={mode === "coach" ? "페파의 읽기 코칭" : "또박또박 책 녹음"} icon={mode === "coach" ? "🎤" : "📼"} iconId={`reading:${mode}`} scene="reading" onBack={() => setBookId(null)}>
        {mode === "coach" ? <Coach book={book} onFinish={finish} /> : <Recorder book={book} user={auth?.user.id ?? "guest"} onFinish={finish} />}
      </ModeShell>
    );
  }

  if (mode) {
    return (
      <ModeShell title="책 고르기" icon="📚" iconId="reading:books" scene="reading" onBack={() => setMode(null)}>
        <div className="grid h-full grid-cols-4 content-center gap-5 overflow-y-auto px-10 pb-6 portrait:grid-cols-2 portrait:content-start portrait:gap-3 portrait:px-4 portrait:pt-2">
          {BOOKS.map((b, i) => (
            <SquishButton
              key={b.id}
              tone={toneAt(i)}
              className="flex flex-col items-center gap-2 rounded-[2rem] px-3 py-5"
              onClick={() => {
                sfx.pop();
                setBookId(b.id);
              }}
            >
              <PageArt art={b.pages[0].art} imageKey={`book:${b.id}:0`} size="72px" color="#3e3a52" />
              <span className="text-center text-2xl leading-tight break-keep">{b.title}</span>
            </SquishButton>
          ))}
        </div>
      </ModeShell>
    );
  }

  return (
    <ModeShell title={menuOf("reading").title} icon="🎤" iconId="menu:reading" scene="reading">
      <div className="flex h-full items-center justify-center gap-10 px-8 pb-6 portrait:flex-col portrait:gap-5 portrait:px-4">
        <Peppa size={portrait ? 130 : 180} className="animate-float" />
        <div className="grid grid-cols-2 gap-5 portrait:w-full portrait:gap-3">
          {(
            [
              { id: "coach", icon: "🎤", title: "페파랑 같이 읽기", desc: "소리 내어 읽으면 페파가 들어 줘요", tone: "rose" },
              { id: "record", icon: "📼", title: "내 목소리 책", desc: "또박또박 읽으며 녹음해요", tone: "sky" },
            ] as const
          ).map((m) => (
            <MenuCard
              key={m.id}
              tone={m.tone}
              title={<span className="text-2xl portrait:text-xl">{m.title}</span>}
              sub={m.desc}
              className="w-[min(34vw,340px)] portrait:w-auto"
              artClassName="aspect-[4/3] flex-none"
              art={<Icon id={`reading:${m.id}`} emoji={m.icon} className="text-[8rem] portrait:text-[5.5rem]" />}
              onClick={() => {
                sfx.wake();
                sfx.pop();
                void say(pick([LINES.reading]));
                setMode(m.id);
              }}
            />
          ))}
        </div>
      </div>
    </ModeShell>
  );
}
