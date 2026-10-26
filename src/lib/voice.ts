/**
 * 목소리 — 미리 구운 Typecast 음성 파일(성우 민정·수아)이 있으면 그 파일을, 없으면 기기 기본 음성(speechSynthesis)으로 읽는다.
 * 파일 목록은 content/voice-manifest.json: { "minjeong": { "기역": "voice/minjeong/3f2a….mp3" }, "sua": { … } } (scripts/typecast.mts 가 만든다).
 * 성우는 로그인한 아이디의 설정(settings.voice). 그 성우 파일이 없으면 다른 성우 파일, 그것도 없으면 기기 음성.
 * say() 를 새로 부르면 앞에 말하던 것은 끊는다 — 아이가 빨리 눌러도 소리가 겹치지 않게.
 */

import manifest from "@/content/voice-manifest.json";
import timing from "@/content/voice-timing.json";
import { readSaved } from "@/lib/store";
import { DEFAULT_VOICE, VOICES, type VoiceId } from "@/lib/voices";

const FILES = manifest as Partial<Record<VoiceId, Record<string, string>>>;
/** 파일마다 말소리 구간(초) — scripts/voice-timing.mts */
const TIMING = timing as Record<string, number[][]>;

/** 지금 읽는 말 — 노래방처럼 읽는 곳의 글자 색을 바꾸는 데 쓴다(components/ReadAlong) */
export interface Speaking {
  text: string;
  /** 이 말을 읽기 시작하고 지난 시간(초) */
  elapsed: () => number;
  /** 말소리 구간 — 성우 파일이면 있다 */
  segs: number[][] | null;
  /** 기기 음성일 때 어림한 길이(초) */
  estimate: number;
}

let speaking: Speaking | null = null;
const listeners = new Set<() => void>();

function setSpeaking(s: Speaking | null) {
  if (speaking === s) return;
  speaking = s;
  for (const l of listeners) l();
}

export function currentSpeaking(): Speaking | null {
  return speaking;
}

/** 읽는 말이 바뀔 때(시작·끝) 알려 준다 — 끄는 함수를 돌려준다 */
export function onSpeaking(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function currentVoice(): VoiceId {
  try {
    return readSaved().settings.voice;
  } catch {
    return DEFAULT_VOICE;
  }
}

/** 이 말의 소리 파일 — 고른 성우 먼저, 없으면 다른 성우 */
function fileFor(text: string, voice: VoiceId): string | undefined {
  return FILES[voice]?.[text] ?? VOICES.map((v) => FILES[v.id]?.[text]).find(Boolean);
}

let token = 0;
let audio: HTMLAudioElement | null = null;
let koVoice: SpeechSynthesisVoice | null | undefined;

function synth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

/** 기기 한국어 음성 고르기 — 자연스러운 것(Google·Natural·Online) 먼저 */
function pickVoice(): SpeechSynthesisVoice | null {
  if (koVoice !== undefined && koVoice !== null) return koVoice;
  const s = synth();
  if (!s) return null;
  const ko = s.getVoices().filter((v) => v.lang.toLowerCase().startsWith("ko"));
  if (ko.length === 0) return null;
  const score = (v: SpeechSynthesisVoice) => (/natural|online|google|neural/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
  koVoice = [...ko].sort((a, b) => score(b) - score(a))[0] ?? null;
  return koVoice;
}

if (typeof window !== "undefined") {
  synth()?.addEventListener?.("voiceschanged", () => {
    koVoice = undefined;
  });
}

function playFile(file: string, text: string, alive: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (!alive()) return resolve();
    const a = new Audio(`/${file}`);
    audio = a;
    const now: Speaking = { text, elapsed: () => a.currentTime, segs: TIMING[file] ?? null, estimate: 0 };
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      if (speaking === now) setSpeaking(null);
      resolve();
    };
    const timer = window.setTimeout(finish, 15_000);
    a.onplaying = () => {
      if (alive()) setSpeaking(now);
    };
    a.onended = finish;
    a.onerror = finish;
    a.onpause = finish;
    a.play().catch(finish);
  });
}

function speakTts(text: string, alive: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const s = synth();
    if (!s || !alive()) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 0.88;
    u.pitch = 1.12;
    let t0 = 0;
    // 기기 음성은 말소리 구간을 모른다 — 한 글자 0.3초쯤으로 어림
    const now: Speaking = { text, elapsed: () => (performance.now() - t0) / 1000, segs: null, estimate: [...text.replace(/[^가-힣A-Za-z0-9]/g, "")].length * 0.3 };
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      if (speaking === now) setSpeaking(null);
      resolve();
    };
    // 안드로이드에서 onend 가 안 올 때가 있다 — 글 길이만큼 기다리고 넘어간다
    const timer = window.setTimeout(finish, 1500 + text.length * 380);
    u.onstart = () => {
      t0 = performance.now();
      if (alive()) setSpeaking(now);
    };
    u.onend = finish;
    u.onerror = finish;
    s.speak(u);
  });
}

export function stopVoice(): void {
  token++;
  if (audio) {
    audio.onpause = null;
    audio.pause();
    audio = null;
  }
  synth()?.cancel();
  setSpeaking(null);
}

/** 하나 또는 여러 말을 차례로 — 끝까지 말하면 resolve. voice 를 주면 그 성우로(설정 화면 '들어 보기') */
export async function say(texts: string | readonly string[], voice?: VoiceId): Promise<void> {
  const list = typeof texts === "string" ? [texts] : [...texts];
  const who = voice ?? currentVoice();
  stopVoice();
  const mine = ++token;
  const alive = () => mine === token;
  for (const t of list) {
    if (!alive()) return;
    const file = fileFor(t, who);
    if (file) await playFile(file, t, alive);
    else await speakTts(t, alive);
  }
}

/** 부모 페이지용 — 성우마다 구워 둔 파일 수와 기기 한국어 음성 */
export function voiceStatus(): { files: Record<VoiceId, number>; deviceVoice: string | null } {
  const files = Object.fromEntries(VOICES.map((v) => [v.id, Object.keys(FILES[v.id] ?? {}).length])) as Record<VoiceId, number>;
  return { files, deviceVoice: pickVoice()?.name ?? null };
}

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
