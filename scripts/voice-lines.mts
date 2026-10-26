/**
 * Typecast(민정) 음성으로 만들 말 목록 — 앱이 소리 내 읽는 모든 말.
 *   안내 말 · 내 이름 · 글자 이름·낱말·글자(오늘의 모험·미션·자유 모드·은하계) · 책 · 읽기 이해 글 · 단원 찾기 퀴즈
 * 같은 말은 한 번만. 글자 수 합계는 크레딧 견적용.
 *   npm run voice:lines   → scripts/voice-lines.json
 */

import { writeFileSync } from "node:fs";
import { BOOKS } from "../src/curriculum/books.ts";
import { CHILD, NAME_SYLLABLES } from "../src/curriculum/child.ts";
import { BUILT_UNITS, unitDays } from "../src/curriculum/days.ts";
import { DIAG_LEVELS } from "../src/curriculum/diagnose.ts";
import { syllableGrid } from "../src/curriculum/hangul.ts";
import { speakOf } from "../src/curriculum/items.ts";
import { CONSONANTS, DOUBLE_CONSONANTS, VOWELS, COMPOUND_VOWELS } from "../src/curriculum/jamo.ts";
import { allLineTexts } from "../src/curriculum/lines.ts";
import { MISSIONS } from "../src/curriculum/missions.ts";
import { EXPLAIN, FIND_ME, READ_ANSWER } from "../src/curriculum/reading.ts";
import type { ActivitySpec } from "../src/curriculum/types.ts";
import { WORDS } from "../src/curriculum/words.ts";

const groups: Record<string, Set<string>> = {
  "안내 말": new Set(allLineTexts()),
  // 작업실 낱말 쓰기의 「내 이름」 — 이하온 · 이 · 하 · 온
  "내 이름": new Set([CHILD.full, ...NAME_SYLLABLES]),
  "글자 이름": new Set([...CONSONANTS, ...DOUBLE_CONSONANTS, ...VOWELS, ...COMPOUND_VOWELS].map((j) => j.name)),
  "글자(가 나 다 …)": new Set(syllableGrid(CONSONANTS.map((c) => c.char), ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ"])),
  "낱말": new Set(WORDS.map((w) => w.text)),
  "책": new Set(),
  "읽기 이해 글": new Set(),
  "단원 찾기 퀴즈": new Set(DIAG_LEVELS.flatMap((l) => l.items.map((i) => i.say))),
};

function collect(a: ActivitySpec) {
  if ("items" in a) for (const item of a.items) groups["낱말"].add(speakOf(item));
  if ("pool" in a) for (const item of a.pool) groups["낱말"].add(speakOf(item));
  if (a.kind === "sound-match") for (const r of a.rounds) for (const w of [r.word, r.answer, ...r.others]) groups["낱말"].add(w);
  if (a.kind === "read") for (const r of a.rounds) [r.text, r.question ?? "", ...r.choices].forEach((t) => t && groups["읽기 이해 글"].add(t));
}

for (const plan of BUILT_UNITS.flatMap((u) => unitDays(u))) plan.activities.forEach(collect);
for (const m of MISSIONS) m.items.forEach((x) => collect(x.spec));
for (const r of [...EXPLAIN, ...FIND_ME, ...READ_ANSWER]) {
  groups["읽기 이해 글"].add(r.text);
  const q = (r as { question?: string }).question;
  if (q) groups["읽기 이해 글"].add(q);
}
for (const b of BOOKS) {
  groups["책"].add(b.title);
  for (const p of b.pages) {
    groups["책"].add(p.text);
    for (const w of p.text.split(" ")) groups["책"].add(w.replace(/[.,!?]/g, ""));
  }
}

// 앞 묶음에 이미 있는 말은 뒤 묶음에서 뺀다. 한글이 없는 것(나를 찾아줘의 그림 짝 "🐻🧢")은 읽을 말이 아니라 뺀다
const seen = new Set<string>();
const out: Record<string, string[]> = {};
const speakable = (t: string) => /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(t);
for (const [name, set] of Object.entries(groups)) {
  out[name] = [...set].filter((t) => t && speakable(t) && !seen.has(t));
  out[name].forEach((t) => seen.add(t));
}

const all = [...seen];
const chars = all.reduce((n, t) => n + [...t].length, 0);
writeFileSync(new URL("./voice-lines.json", import.meta.url), JSON.stringify({ total: all.length, chars, groups: out }, null, 2) + "\n");

for (const [name, list] of Object.entries(out)) {
  console.log(`${name}: ${list.length}줄, ${list.reduce((n, t) => n + [...t].length, 0)}자`);
}
console.log(`합계: ${all.length}줄, ${chars}자 → scripts/voice-lines.json`);
