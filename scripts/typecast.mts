/**
 * Typecast 음성 굽기 — scripts/voice-lines.json 의 말을 성우(민정·수아) 목소리 MP3 로 만든다.
 * API: POST https://api.typecast.ai/v1/text-to-speech · 헤더 X-API-KEY · 응답은 오디오 바이너리 · 1글자 = 1크레딧
 * 요청 모양은 보이스동화(Desktop/Dong src/lib/typecast.ts)에서 실제로 써 온 것을 따른다:
 *   감정은 느낌표 말에만 낮게(0.5 — 높으면 음색까지 하이톤), 빠르기는 1 이 아닐 때만 보낸다.
 * 키는 보이스동화와 같은 계정(같은 크레딧)이다 — 굽기 전에 이번 달 사용량을 보고 안전선(19만)을 넘으면 멈춘다.
 *
 *   npm run voice:lines                                   말 목록 새로 뽑기 (먼저)
 *   npm run voice:list                                    API 보이스 목록에서 민정·수아 찾기 — 크레딧 안 씀
 *   npm run voice:make -- --test                          짧은 말·긴 말을 섞은 12줄 견적 (성우마다)
 *   npm run voice:make -- --test --yes                    그 12줄 실제로 굽기
 *   npm run voice:make -- --voice all --yes               나머지 전부 (이미 구운 줄은 건너뜀)
 *   --voice minjeong|sua|all · --limit N · --yes 없으면 견적만
 *
 * .env.local: TYPECAST_API_KEY · TYPECAST_VOICE_MINJEONG · TYPECAST_VOICE_SUA (voice_id, 비우면 한국어 이름으로 찾음)
 * 결과: public/voice/<성우>/<해시>.mp3 + src/content/voice-manifest.json (한 줄마다 저장 — 끊겨도 이어서)
 *       실패한 줄은 scripts/voice-failures.json (그 말은 앱에서 기기 음성으로 읽힌다)
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const API = "https://api.typecast.ai";
const MODEL = "ssfm-v30";
const CONCURRENCY = 2;
/** 이번 달 사용량이 이 선을 넘으면 굽지 않는다 — 보이스동화와 같은 안전선(라이트 20만 중 19만) */
const SAFE_LIMIT = Number(process.env.TYPECAST_SAFE_LIMIT ?? 190_000);

const VOICE_KEYS = {
  minjeong: { name: "민정", env: "TYPECAST_VOICE_MINJEONG", tempo: 1 },
  sua: { name: "수아", env: "TYPECAST_VOICE_SUA", tempo: 1 },
} as const;
type VoiceKey = keyof typeof VOICE_KEYS;

/** 시험 굽기 — 아주 짧은 말(한 글자·글자 이름·감탄)이 거부되는지 먼저 본다 */
const TEST_LINES = ["안녕! 오늘도 한글 놀이 하자!", "잘했어!", "다음!", "기역", "히읗", "아", "가", "호", "사과", "할아버지", "토끼가 장을 봐요.", "모자를 쓴 곰을 찾아줘."];

interface ApiVoice {
  voice_id: string;
  voice_name: { eng: string; kor: string };
  models: { version: string; emotions: string[] }[];
  gender: string | null;
  age: string | null;
  preview_url: string | null;
}

/** .env.local 읽기 — 이미 있는 환경변수는 그대로 */
function loadEnv() {
  const file = new URL(".env.local", ROOT);
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function listVoices(key: string): Promise<ApiVoice[]> {
  const res = await fetch(`${API}/v3/voices?model=${MODEL}`, { headers: { "X-API-KEY": key } });
  if (!res.ok) throw new Error(`보이스 목록 ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as ApiVoice[];
}

/** 이번 달 쓴 크레딧 — 못 읽으면 null */
async function usedThisMonth(key: string): Promise<number | null> {
  try {
    const res = await fetch(`${API}/v1/users/me/subscription`, { headers: { "X-API-KEY": key } });
    if (!res.ok) return null;
    const data = (await res.json()) as { credits?: { used_credits?: number } };
    return Number(data.credits?.used_credits ?? 0);
  } catch {
    return null;
  }
}

/** 성우 — 환경변수 voice_id 가 있으면 그것, 없으면 한국어 이름으로 */
function resolveVoice(voices: ApiVoice[], v: VoiceKey): ApiVoice {
  const want = process.env[VOICE_KEYS[v].env];
  if (want) {
    const hit = voices.find((x) => x.voice_id === want);
    if (!hit) throw new Error(`${VOICE_KEYS[v].env}=${want} 를 ${MODEL} 목록에서 못 찾았어요`);
    return hit;
  }
  const hits = voices.filter((x) => x.voice_name.kor === VOICE_KEYS[v].name);
  if (hits.length !== 1) throw new Error(`'${VOICE_KEYS[v].name}' 이 ${hits.length}개예요 — .env.local 에 ${VOICE_KEYS[v].env}=voice_id 를 넣어 주세요`);
  return hits[0];
}

function manifestPath() {
  return new URL("src/content/voice-manifest.json", ROOT);
}

function readManifest(): Record<string, Record<string, string>> {
  try {
    return JSON.parse(readFileSync(manifestPath(), "utf8"));
  } catch {
    return {};
  }
}

function hashOf(text: string) {
  return createHash("sha1").update(text).digest("hex").slice(0, 16);
}

async function speak(key: string, voice: ApiVoice, text: string, tempo: number): Promise<Buffer> {
  const emotions = voice.models.find((m) => m.version === MODEL)?.emotions ?? [];
  const body: Record<string, unknown> = {
    voice_id: voice.voice_id,
    text,
    model: MODEL,
    language: "kor",
    output: { audio_format: "mp3", ...(tempo !== 1 ? { audio_tempo: tempo } : {}) },
  };
  // 칭찬·응원(느낌표)만 밝게, 낮은 세기로 — 높으면 음색까지 바뀐다(보이스동화 실측)
  if (text.trim().endsWith("!") && emotions.includes("happy")) body.prompt = { emotion_preset: "happy", emotion_intensity: 0.5 };
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}/v1/text-to-speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": key },
      body: JSON.stringify(body),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    if (res.status === 401) throw Object.assign(new Error("API 키가 맞지 않아요 (401)"), { fatal: true });
    if (res.status === 402 || detail.includes("CREDIT")) throw Object.assign(new Error("크레딧이 모자라요 (402)"), { fatal: true });
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await sleep(2000 * attempt);
      continue;
    }
    throw new Error(`${res.status} ${detail}`);
  }
}

async function make(key: string) {
  const which = arg("voice") ?? "all";
  const limit = Number(arg("limit") ?? Infinity);
  const test = process.argv.includes("--test");
  const yes = process.argv.includes("--yes");
  const keys: VoiceKey[] = which === "all" ? ["minjeong", "sua"] : [which as VoiceKey];
  if (keys.some((k) => !(k in VOICE_KEYS))) throw new Error("--voice 는 minjeong · sua · all 중 하나");

  let lines = TEST_LINES;
  if (!test) {
    const linesFile = new URL("scripts/voice-lines.json", ROOT);
    if (!existsSync(linesFile)) throw new Error("scripts/voice-lines.json 이 없어요 — npm run voice:lines 먼저");
    lines = Object.values((JSON.parse(readFileSync(linesFile, "utf8")) as { groups: Record<string, string[]> }).groups).flat();
  }

  const manifest = readManifest();
  const plan = keys.map((k) => {
    const todo = lines.filter((t) => !manifest[k]?.[t]).slice(0, limit);
    return { k, todo, credits: todo.reduce((n, t) => n + [...t].length, 0) };
  });
  const total = plan.reduce((n, p) => n + p.credits, 0);
  for (const p of plan) console.log(`${VOICE_KEYS[p.k].name}: 구울 말 ${p.todo.length}줄 · 약 ${p.credits.toLocaleString()} 크레딧`);
  console.log(`합계 약 ${total.toLocaleString()} 크레딧 (1글자 = 1크레딧)`);

  if (key) {
    const used = await usedThisMonth(key);
    if (used !== null) {
      console.log(`이번 달 사용 ${used.toLocaleString()} · 안전선 ${SAFE_LIMIT.toLocaleString()}까지 남은 ${(SAFE_LIMIT - used).toLocaleString()}`);
      if (used + total > SAFE_LIMIT) throw new Error("이번에 구우면 안전선을 넘어요 — 멈춰요 (보이스동화 음성이 잠길 수 있어요)");
    } else console.log("이번 달 사용량을 못 읽었어요 — 안전선 확인 없이 진행됩니다");
  }
  if (!yes) {
    console.log("견적만 보여 줬어요. 실제로 구우려면 --yes 를 붙이세요.");
    return;
  }

  const voices = await listVoices(key);
  const failures: { voice: string; text: string; error: string }[] = [];
  for (const p of plan) {
    const voice = resolveVoice(voices, p.k);
    console.log(`▶ ${VOICE_KEYS[p.k].name} (${voice.voice_id}) — ${p.todo.length}줄`);
    mkdirSync(new URL(`public/voice/${p.k}/`, ROOT), { recursive: true });
    manifest[p.k] ??= {};
    let next = 0;
    let done = 0;
    let stop: Error | null = null;
    const worker = async () => {
      while (next < p.todo.length && !stop) {
        const text = p.todo[next++];
        try {
          const file = `voice/${p.k}/${hashOf(text)}.mp3`;
          writeFileSync(new URL(file, new URL("public/", ROOT)), await speak(key, voice, text, VOICE_KEYS[p.k].tempo));
          manifest[p.k][text] = file;
          writeFileSync(manifestPath(), JSON.stringify(manifest, null, 2) + "\n");
        } catch (e) {
          const err = e as Error & { fatal?: boolean };
          if (err.fatal) stop = err;
          else failures.push({ voice: p.k, text, error: err.message });
        }
        done++;
        if (done % 20 === 0 || done === p.todo.length) console.log(`  ${done}/${p.todo.length}`);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (stop) throw stop;
  }
  writeFileSync(new URL("scripts/voice-failures.json", ROOT), JSON.stringify(failures, null, 2) + "\n");
  if (failures.length) {
    console.log(`실패 ${failures.length}줄 (기기 음성으로 읽힘) — scripts/voice-failures.json`);
    for (const f of failures.slice(0, 15)) console.log(`  ${f.voice} '${f.text}': ${f.error}`);
  }
  const after = await usedThisMonth(key);
  if (after !== null) console.log(`이번 달 사용 ${after.toLocaleString()}`);
  console.log("끝 — src/content/voice-manifest.json 갱신됨. 개발 서버 새로고침하면 바로 들려요.");
}

async function main() {
  loadEnv();
  const key = process.env.TYPECAST_API_KEY ?? "";
  const cmd = process.argv[2];
  if (!key) console.log(".env.local 에 TYPECAST_API_KEY 를 넣어 주세요 (studio.typecast.ai/developers/api 에서 발급).");
  if (cmd === "list") {
    if (!key) return;
    const voices = await listVoices(key);
    const mine = voices.filter((v) => ["민정", "수아"].includes(v.voice_name.kor) || Object.values(VOICE_KEYS).some((k) => process.env[k.env] === v.voice_id));
    console.log(`${MODEL} 보이스 ${voices.length}개 중 민정·수아:`);
    for (const v of mine) {
      const emotions = v.models.find((m) => m.version === MODEL)?.emotions ?? [];
      console.log(`  ${v.voice_name.kor} (${v.voice_name.eng}) ${v.voice_id} · ${v.gender ?? "-"}/${v.age ?? "-"} · 감정 ${emotions.join(",")}`);
    }
    if (mine.length === 0) console.log("  없어요 — studio.typecast.ai/developers/api/voices 에서 확인해 주세요.");
    const used = await usedThisMonth(key);
    if (used !== null) console.log(`이번 달 사용 ${used.toLocaleString()} 크레딧`);
    return;
  }
  if (cmd === "make") {
    await make(key);
    return;
  }
  console.log("쓰는 법: node scripts/typecast.mts list | make [--test] [--voice minjeong|sua|all] [--limit N] [--yes]");
}

main().catch((e) => {
  console.error(`✖ ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
