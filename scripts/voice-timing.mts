/**
 * 음성 파일마다 말소리가 나는 구간을 잰다 — 노래방처럼 읽는 곳의 글자 색을 바꿀 때 쓴다(lib/readAlong).
 *   npm run voice:timing          새로 구운 파일만 (이미 잰 파일은 건너뜀)
 *   npm run voice:timing -- --all 전부 다시
 * ffmpeg silencedetect 로 조용한 곳(-40dB 아래 0.1초 이상)을 찾고, 그 사이를 말소리 구간으로 적는다.
 * 결과: src/content/voice-timing.json { "voice/sua/<해시>.mp3": [[시작초, 끝초], …] }
 * 문장부호(! . ,)마다 성우가 쉬어서 구간이 문장 조각과 거의 맞는다.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("src/content/voice-manifest.json", ROOT), "utf8")) as Record<string, Record<string, string>>;
const outFile = new URL("src/content/voice-timing.json", ROOT);
const old = existsSync(outFile) && !process.argv.includes("--all") ? (JSON.parse(readFileSync(outFile, "utf8")) as Record<string, number[][]>) : {};

const r2 = (n: number) => Math.round(n * 100) / 100;

function speechOf(file: string): number[][] {
  // ffmpeg 은 잰 결과를 stderr 로 쓴다
  const run = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "silencedetect=noise=-40dB:d=0.1", "-f", "null", "-"], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`ffmpeg 실패: ${file}\n${run.stderr}`);
  return parse(run.stderr);
}

function parse(log: string): number[][] {
  const dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(log);
  const total = dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]) : 0;
  const quiet: number[][] = [];
  let start: number | null = null;
  for (const line of log.split(/\r?\n/)) {
    const s = /silence_start: (-?[\d.]+)/.exec(line);
    if (s) start = Math.max(0, Number(s[1]));
    const e = /silence_end: ([\d.]+)/.exec(line);
    if (e && start !== null) {
      quiet.push([start, Number(e[1])]);
      start = null;
    }
  }
  if (start !== null) quiet.push([start, total]);
  // 조용한 곳 사이 = 말소리. 아주 짧은 소리(0.06초 미만)는 숨소리로 보고 버린다
  const speech: number[][] = [];
  let at = 0;
  for (const [qs, qe] of quiet) {
    if (qs - at >= 0.06) speech.push([r2(at), r2(qs)]);
    at = qe;
  }
  if (total - at >= 0.06) speech.push([r2(at), r2(total)]);
  return speech;
}

const files = [...new Set(Object.values(manifest).flatMap((m) => Object.values(m)))].sort();
const out: Record<string, number[][]> = {};
let measured = 0;
for (const f of files) {
  if (old[f]) {
    out[f] = old[f];
    continue;
  }
  const local = new URL(`public/${f}`, ROOT);
  if (!existsSync(local)) continue;
  out[f] = speechOf(decodeURIComponent(local.pathname).replace(/^\/([A-Za-z]:)/, "$1"));
  measured++;
  if (measured % 50 === 0) console.log(`  잰 파일 ${measured}…`);
}
writeFileSync(outFile, JSON.stringify(out) + "\n");
console.log(`새로 잼 ${measured} · 전체 ${Object.keys(out).length} → src/content/voice-timing.json`);
