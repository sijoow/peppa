/**
 * 미션 모드 — 토도한글 미션 88개. 목록·순서·이름은 토도 그대로(2026-10-26 클래스룸 커리큘럼 페이지).
 * 미션마다 콘텐츠 5~9개(토도: 활동·영상·책 10개 내외 — 영상은 아직 없다). 마지막 '확인 퀴즈'(quiz)는
 * 힌트 없이 첫 시도만 채점(토도: 일부 미션에 평가 퀴즈). 진도·반딧불이와 상관없이 처음부터 열려 있고, 다 하면 배지.
 * 미션 안 활동 구성과 낱말은 토도가 공개하지 않아 미션 이름에 맞춰 우리가 짰다.
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

import { compose, syllableGrid } from "./hangul.ts";
import { EXPLAIN, FIND_ME, READ_ANSWER } from "./reading.ts";
import type { ActivitySpec } from "./types.ts";

export interface MissionItem {
  spec: ActivitySpec;
  quiz?: boolean;
}

export interface Mission {
  id: string;
  no: number;
  group: string;
  title: string;
  items: MissionItem[];
}

const it = (spec: ActivitySpec): MissionItem => ({ spec });
const quiz = (m: MissionItem): MissionItem => ({ ...m, quiz: true });
const tap = (items: string[]) => it({ kind: "tap-pop", items });
const intro = (items: string[]) => it({ kind: "intro", items });
const listen = (items: string[], pool = items) => it({ kind: "listen-choose", items, pool });
const same = (items: string[], pool = items) => it({ kind: "find-same", items, pool });
const drag = (items: string[]) => it({ kind: "drag-match", items });
const trace = (items: string[]) => it({ kind: "trace", items });
const clap = (items: string[]) => it({ kind: "clap", items });
const picture = (items: string[], pool = items) => it({ kind: "word-picture", items, pool });
const book = (bookId: string) => it({ kind: "book", bookId });
const blend = (items: string[], pool = items) => it({ kind: "blend", items, pool });
const sound = (mode: "first" | "last", rounds: { word: string; answer: string; others: string[] }[]) => it({ kind: "sound-match", mode, rounds });
const read = (skin: "explain" | "find-me" | "read-answer", rounds: { text: string; question?: string; answer: string; choices: string[] }[]) => it({ kind: "read", skin, rounds });

const G1 = ["ㄱ", "ㄴ", "ㄷ", "ㄹ"];
const G2 = ["ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ"];
const G3 = ["ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const CONS = [...G1, ...G2, ...G3];
const VOW = ["ㅏ", "ㅑ", "ㅓ", "ㅕ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"];
const BASIC6 = ["ㅏ", "ㅓ", "ㅗ", "ㅜ", "ㅡ", "ㅣ"];
const CIRCLED = ["①", "②", "③", "④", "⑤"];

// ── 낱말 (그림이 있는 낱말만 그림 놀이에 쓴다 — words.ts) ──
const FRUIT_M = ["사과", "바나나", "포도", "딸기", "수박", "귤", "복숭아", "체리"];
const VEG_M = ["당근", "오이", "감자", "호박", "옥수수", "고추", "버섯", "브로콜리"];
const ANIMAL_M = ["강아지", "고양이", "토끼", "곰", "사자", "기린", "돼지", "여우"];
const FOOD_M = ["밥", "빵", "우유", "국수", "달걀", "피자", "케이크", "아이스크림"];
const CLOTHES_M = ["모자", "양말", "신발", "바지", "치마", "장갑", "티셔츠", "코트"];

/** 처음 소리가 같은 짝 — 음운 인식(첫 음절 변별) */
const FIRST_PAIRS = [
  { word: "사과", answer: "사자", others: ["포도", "오리"] },
  { word: "바나나", answer: "바다", others: ["기린", "우유"] },
  { word: "고양이", answer: "고기", others: ["하마", "별"] },
  { word: "토끼", answer: "토마토", others: ["사탕", "신발"] },
  { word: "오리", answer: "오이", others: ["기차", "모자"] },
  { word: "기린", answer: "기차", others: ["곰", "버스"] },
  { word: "우유", answer: "우산", others: ["달", "피자"] },
  { word: "포도", answer: "포크", others: ["수박", "꽃"] },
  { word: "거미", answer: "거북이", others: ["나비", "해"] },
  { word: "피자", answer: "피아노", others: ["사과", "곰"] },
];

/** 끝소리가 같은 짝 — 음운 인식(끝 음절 변별) */
const LAST_PAIRS = [
  { word: "사자", answer: "모자", others: ["오리", "기차"] },
  { word: "오리", answer: "개구리", others: ["사과", "하마"] },
  { word: "오이", answer: "고양이", others: ["포도", "버스"] },
  { word: "토끼", answer: "도끼", others: ["치마", "우유"] },
  { word: "하마", answer: "치마", others: ["오리", "수박"] },
  { word: "기차", answer: "자동차", others: ["피자", "나비"] },
  { word: "피자", answer: "과자", others: ["고기", "바다"] },
  { word: "장갑", answer: "지갑", others: ["양말", "가방"] },
  { word: "양말", answer: "말", others: ["공", "집"] },
  { word: "거북이", answer: "원숭이", others: ["바나나", "모자"] },
];

const BLEND_WORDS = ["사과", "포도", "오리", "토끼", "바나나", "고양이", "강아지", "기린", "우유", "모자", "나비", "하마"];

/** 모음마다 그 모음이 든 낱말 */
const VOWEL_WORDS: Record<string, string[]> = {
  "ㅏ": ["아기", "가방", "나비", "바다", "사자", "하마"],
  "ㅓ": ["거미", "버스", "거북이"],
  "ㅗ": ["오리", "고기", "포도", "모자", "코", "소"],
  "ㅜ": ["우유", "구두", "우산", "부엉이"],
  "ㅡ": ["스키", "드럼"],
  "ㅣ": ["기차", "비", "피자", "치마", "기린"],
};

/** 첫 자음마다 그 자음으로 시작하는 낱말 */
const CONS_WORDS: Record<string, string[]> = {
  "ㄱ": ["가방", "기차", "고기", "기린", "곰", "귤"],
  "ㄴ": ["나비", "눈", "나무"],
  "ㄷ": ["달", "달걀", "돼지", "도끼", "드럼", "다람쥐"],
  "ㄹ": ["로봇", "레몬"],
  "ㅁ": ["모자", "말", "물", "문", "문어"],
  "ㅂ": ["바나나", "버스", "별", "비", "배", "바지"],
  "ㅅ": ["사과", "사자", "소", "수박", "새", "신발"],
  "ㅈ": ["자동차", "지갑", "장갑", "주스"],
  "ㅎ": ["하마", "해", "호박", "호랑이", "할머니"],
};

/** 받침 없는 낱말 */
const OPEN_WORDS = ["나비", "모자", "기차", "바다", "사자", "오리", "하마", "우유", "포도", "치마", "피자", "아기", "거미", "고기", "구두", "바지", "토끼", "개미"];

/** 받침마다 그 받침이 든 낱말 */
const BAT_WORDS: Record<string, string[]> = {
  "ㅁ": ["곰", "밤", "사람", "컴퓨터", "엄마"],
  "ㅇ": ["공", "빵", "양", "용", "풍선"],
  "ㄴ": ["눈", "돈", "산", "손", "문"],
  "ㄹ": ["달", "별", "물", "발", "귤"],
  "ㅂ": ["밥", "집", "입", "컵", "지갑"],
  "ㄱ": ["책", "약", "수박", "박수"],
};

const CLOSED_WORDS = ["연필", "공책", "선물", "풍선", "왕관", "우산", "장갑", "신발", "양말", "수박", "당근", "호박", "버섯", "옥수수"];

/** 거센소리·된소리 낱말과, 헷갈리는 짝(예사소리) */
const STRONG_WORDS: Record<string, string[]> = {
  "ㅋ": ["코", "코끼리", "키위", "카메라"],
  "ㅌ": ["토끼", "토마토", "트럭", "텐트"],
  "ㅍ": ["포도", "피자", "피아노", "포크", "펭귄"],
  "ㅊ": ["치마", "치즈", "체리"],
  "ㄲ": ["꽃", "꿀", "토끼", "코끼리"],
  "ㄸ": ["딸기", "똥"],
  "ㅃ": ["빵"],
  "ㅆ": ["씨앗"],
  "ㅉ": [],
};
const PLAIN_OF: Record<string, string[]> = {
  "ㅋ": ["ㄱ"],
  "ㅌ": ["ㄷ"],
  "ㅍ": ["ㅂ"],
  "ㅊ": ["ㅈ"],
  "ㄲ": ["ㄱ", "ㅋ"],
  "ㄸ": ["ㄷ", "ㅌ"],
  "ㅃ": ["ㅂ", "ㅍ"],
  "ㅆ": ["ㅅ"],
  "ㅉ": ["ㅈ", "ㅊ"],
};

const DIPH_WORDS: Record<string, string[]> = {
  "ㅘㅝㅟㅢ": ["사과", "과자", "왕관", "원숭이", "귀", "쥐", "의자"],
  "ㅑㅕㅛㅠ": ["야구", "양", "여우", "염소", "요요", "우유", "유령"],
  "ㅔㅐ": ["게", "개", "새", "배", "레몬", "체리", "카메라"],
  "ㅚㅙㅖㅒ": ["돼지", "외계인", "열쇠", "시계"],
};

const uniq = (a: string[]) => [...new Set(a)];
const wordsOf = (table: Record<string, string[]>, keys: string[]) => uniq(keys.flatMap((k) => table[k] ?? []));

// ── 미션 틀 ──

function nameMission(letters: string[], bookId: string, pool: string[]): MissionItem[] {
  return [
    intro(letters),
    tap(letters),
    listen(letters, pool),
    same(letters, pool),
    drag(letters.slice(0, 3)),
    trace(letters.slice(0, 2)),
    book(bookId),
    quiz(listen(letters, pool)),
  ];
}

function wordMission(words: string[], bookId?: string): MissionItem[] {
  return [
    intro(words.slice(0, 4)),
    picture(words.slice(0, 4), words),
    intro(words.slice(4)),
    picture(words.slice(4), words),
    listen(words.slice(1, 5), words),
    same(words.slice(2, 5), words),
    drag(words.slice(5, 8)),
    ...(bookId ? [book(bookId)] : []),
    quiz(picture([words[0], words[3], words[5], words[7]], words)),
  ];
}

function vowelMission(vs: string[], step: number): MissionItem[] {
  const syl = syllableGrid(["ㄱ", "ㄴ", "ㄷ", "ㅁ"], vs);
  const words = wordsOf(VOWEL_WORDS, vs);
  if (step === 0) return [intro(vs), tap([...vs, ...syllableGrid(["ㅇ"], vs)]), listen(vs, VOW), same(vs, VOW), trace(vs), book("letters-4")];
  if (step === 1) return [intro(syl.slice(0, 4)), listen(syl, syl), same(syl.slice(0, 4), syl), picture(words.slice(0, 4), words), drag(words.slice(0, 3))];
  return [listen(syl.slice(2), syl), picture(words.slice(1, 5), words), clap(words.slice(0, 3)), quiz(listen(syl.slice(0, 5), syl))];
}

function consonantMission(cs: string[], step: number): MissionItem[] {
  const a = syllableGrid(cs, ["ㅏ"]);
  const all = syllableGrid(cs, BASIC6);
  const words = wordsOf(CONS_WORDS, cs);
  if (step === 0) return [intro(cs), intro(a), listen(a, syllableGrid(cs, ["ㅏ", "ㅗ"])), same(syllableGrid(cs, ["ㅏ", "ㅗ", "ㅣ"]).slice(0, 4), all), trace(cs), tap(syllableGrid(cs, ["ㅏ", "ㅗ", "ㅜ"]))];
  if (step === 1) return [listen(all.slice(0, 6), all), same(all.slice(6, 10), all), picture(words.slice(0, 4), words), drag(words.slice(0, 3))];
  return [listen(all.filter((_, i) => i % 2 === 0).slice(0, 6), all), picture(words.slice(-4), words), trace(a.slice(0, 2)), quiz(listen(all.filter((_, i) => i % 3 === 0).slice(0, 5), all))];
}

function openMission(step: number): MissionItem[] {
  const firsts = [["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ"], ["ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅎ"], ["ㄱ", "ㄷ", "ㅁ", "ㅅ", "ㅊ"], ["ㄴ", "ㄹ", "ㅂ", "ㅋ", "ㅍ"], CONS];
  const vs = [["ㅏ"], ["ㅗ", "ㅜ"], ["ㅓ", "ㅣ"], ["ㅡ", "ㅏ", "ㅗ"], BASIC6][step];
  const syl = syllableGrid(firsts[step], vs);
  const w = OPEN_WORDS.slice((step * 4) % OPEN_WORDS.length).concat(OPEN_WORDS).slice(0, 6);
  if (step < 4) return [intro(syl.slice(0, 5)), listen(syl.slice(0, 6), syl), same(syl.slice(1, 5), syl), picture(w.slice(0, 4), OPEN_WORDS), drag(w.slice(3, 6)), tap(syl.slice(0, 6))];
  return [listen(syl.filter((_, i) => i % 5 === 0).slice(0, 6), syl), picture(OPEN_WORDS.slice(8, 12), OPEN_WORDS), same(OPEN_WORDS.slice(12, 15), OPEN_WORDS), quiz(listen(syl.filter((_, i) => i % 7 === 1).slice(0, 5), syl))];
}

function batchimMission(bs: string[], step: number): MissionItem[] {
  const syl = bs.flatMap((b) => ["ㄱ", "ㄴ", "ㄷ", "ㅂ", "ㅅ"].map((c) => compose(c, "ㅏ", b) ?? ""));
  const words = wordsOf(BAT_WORDS, bs);
  if (step === 0) return [intro(bs.map((b) => compose("ㄱ", "ㅏ", b) ?? "")), listen(syl.filter((_, i) => i % 2 === 0), syl), same(syl.slice(1, 5), syl), tap(syl)];
  if (step === 1) return [intro(words.slice(0, 4)), picture(words.slice(0, 4), words), listen(words.slice(2, 6), words), drag(words.slice(0, 3))];
  if (step === 2) return [listen(syl.slice(2, 8), syl), same(words.slice(3, 6), words), trace([words[0]]), clap(words.slice(0, 3))];
  return [quiz(listen(syl.filter((_, i) => i % 3 === 0), syl)), quiz(picture(words.slice(-4), words))];
}

function closedMission(step: number): MissionItem[] {
  const all = ["ㅁ", "ㅇ", "ㄴ", "ㄹ", "ㅂ", "ㄱ"];
  const syl = all.flatMap((b) => ["ㄱ", "ㄷ", "ㅅ"].map((c) => compose(c, "ㅗ", b) ?? ""));
  const w = CLOSED_WORDS;
  if (step === 0) return [intro(syl.slice(0, 6)), listen(syl.slice(0, 6), syl), same(syl.slice(6, 10), syl), tap(syl.slice(0, 8))];
  if (step === 1) return [intro(w.slice(0, 4)), picture(w.slice(0, 4), w), listen(w.slice(0, 4), w), drag(w.slice(1, 4))];
  if (step === 2) return [intro(w.slice(4, 8)), picture(w.slice(4, 8), w), listen(w.slice(4, 8), w), drag(w.slice(5, 8))];
  if (step === 3) return [intro(w.slice(8)), picture(w.slice(8, 12), w), same(w.slice(10, 14), w), trace([w[0]])];
  return [quiz(listen(syl.filter((_, i) => i % 3 === 0), syl)), quiz(picture([w[0], w[5], w[9], w[13]], w))];
}

function strongMission(cs: string[], step: number, review = false): MissionItem[] {
  const vs = ["ㅏ", "ㅗ", "ㅣ"];
  const target = syllableGrid(cs, vs);
  const pool = uniq([...target, ...syllableGrid(cs.flatMap((c) => PLAIN_OF[c] ?? []), vs)]);
  const words = wordsOf(STRONG_WORDS, cs);
  const pics = words.length >= 3 ? [picture(words.slice(0, 4), words)] : [];
  if (review) return [listen(target.slice(0, 6), pool), same(target.slice(0, 4), pool), ...pics, quiz(listen(target.filter((_, i) => i % 2 === 0).slice(0, 5), pool))];
  if (step === 0) return [intro(cs), intro(syllableGrid(cs, ["ㅏ"])), listen(syllableGrid(cs, ["ㅏ"]).concat(target.slice(1, 3)), pool), same(target.slice(0, 3), pool), trace(cs)];
  if (step === 1) return [listen(target, pool), ...pics, ...(words.length >= 3 ? [drag(words.slice(0, 3))] : [tap(target)]), same(target.slice(3), pool)];
  return [listen(target.slice(2), pool), ...pics, quiz(listen(target.slice(0, 5), pool))];
}

function diphMission(vs: string[], step: number, extra = false): MissionItem[] {
  const syl = syllableGrid(["ㅇ", "ㄱ", "ㅅ"], vs);
  const words = DIPH_WORDS[vs.join("")] ?? [];
  if (extra) return [picture(words.slice(0, 4), words), same(syl.slice(0, 4), syl), listen(words.slice(1, 5), words), quiz(picture(words.slice(-4), words))];
  if (step === 0) return [intro(vs), intro(syllableGrid(["ㅇ"], vs)), listen(syllableGrid(["ㅇ"], vs), syl), same(syl.slice(0, 4), syl), trace(vs.slice(0, 2))];
  if (step === 1) return [listen(syl.slice(0, 6), syl), intro(words.slice(0, 4)), picture(words.slice(0, 4), words), drag(words.slice(0, 3))];
  return [listen(syl.slice(-6), syl), picture(words.slice(-4), words), quiz(listen(syl.filter((_, i) => i % 2 === 0).slice(0, 5), syl))];
}

// ── 88개 (토도 순서 그대로) ──

const list: Mission[] = [];
function add(group: string, title: string, items: MissionItem[]) {
  const no = list.length + 1;
  list.push({ id: `m${String(no).padStart(2, "0")}`, no, group, title, items });
}

add("디지털 리터러시", "튜토리얼", [tap(G1), drag(["ㄱ", "ㄴ", "ㄷ"]), trace(["ㅡ", "ㅣ"]), tap(G2), drag(["ㅁ", "ㅇ", "ㅅ"]), trace(["ㄱ", "ㄴ"])]);
add("디지털 리터러시", "한글 공부 준비", [same(G1, CONS), same(["ㅏ", "ㅓ", "ㅗ"], VOW), clap(["곰", "사과", "바나나"]), book("letters-1"), tap(VOW), drag(["ㅏ", "ㅗ", "ㅣ"]), quiz(same(["ㄷ", "ㅂ", "ㅈ"], CONS))]);

add("글자 이름", "글자 이름 ㄱㄴㄷㄹ", nameMission(G1, "letters-1", CONS));
add("글자 이름", "글자 이름 ㅁㅂㅅㅇㅈ", nameMission(G2, "letters-2", CONS));
add("글자 이름", "글자 이름 ㅊㅋㅌㅍㅎ", nameMission(G3, "letters-3", CONS));
add("글자 이름", "글자 이름 - 자음", [listen(["ㄱ", "ㅁ", "ㅅ", "ㅊ", "ㅎ"], CONS), listen(["ㄴ", "ㅂ", "ㅇ", "ㅋ", "ㅌ"], CONS), same(["ㄷ", "ㄹ", "ㅈ", "ㅍ"], CONS), tap(CONS), drag(["ㄹ", "ㅈ", "ㅍ"]), trace(["ㅅ", "ㅈ"]), quiz(listen(["ㄷ", "ㄹ", "ㅈ", "ㅍ", "ㅎ"], CONS))]);
add("글자 이름", "글자 이름 - 모음", nameMission(VOW, "letters-4", VOW));

add("음운 인식", "첫 음절 변별", [sound("first", FIRST_PAIRS.slice(0, 5)), clap(["사과", "사자", "포도"]), sound("first", FIRST_PAIRS.slice(5)), quiz(sound("first", [FIRST_PAIRS[1], FIRST_PAIRS[4], FIRST_PAIRS[7]]))]);
add("음운 인식", "끝 음절 변별", [sound("last", LAST_PAIRS.slice(0, 5)), clap(["하마", "치마", "오리"]), sound("last", LAST_PAIRS.slice(5)), quiz(sound("last", [LAST_PAIRS[0], LAST_PAIRS[4], LAST_PAIRS[8]]))]);
add("음운 인식", "소리 나누고 합치기", [clap(BLEND_WORDS.slice(0, 4)), blend(BLEND_WORDS.slice(0, 4), BLEND_WORDS), clap(BLEND_WORDS.slice(4, 8)), blend(BLEND_WORDS.slice(4, 8), BLEND_WORDS), quiz(blend(BLEND_WORDS.slice(8), BLEND_WORDS))]);

add("통글자", "통글자 - 과일", wordMission(FRUIT_M, "fruit-1"));
add("통글자", "통글자 - 야채", wordMission(VEG_M, "fruit-2"));
add("통글자", "통글자 - 동물", wordMission(ANIMAL_M, "animal-1"));
add("통글자", "통글자 - 음식", wordMission(FOOD_M, "food-1"));
add("통글자", "통글자 - 옷", wordMission(CLOTHES_M, "family-2"));

for (const vs of [["ㅏ", "ㅓ"], ["ㅗ", "ㅜ"], ["ㅡ", "ㅣ"]]) for (let s = 0; s < 3; s++) add("기본 모음과 자음", `모음 ${vs.join("")} ${CIRCLED[s]}`, vowelMission(vs, s));
for (const cs of [["ㄱ", "ㄴ"], ["ㄷ", "ㄹ"], ["ㅁ", "ㅂ"], ["ㅅ", "ㅈ", "ㅎ"]]) for (let s = 0; s < 3; s++) add("기본 모음과 자음", `자음 ${cs.join("")} ${CIRCLED[s]}`, consonantMission(cs, s));
for (let s = 0; s < 5; s++) add("기본 모음과 자음", `받침 없는 글자 ${CIRCLED[s]}`, openMission(s));

for (const bs of [["ㅁ", "ㅇ"], ["ㄴ", "ㄹ"], ["ㅂ", "ㄱ"]]) for (let s = 0; s < 4; s++) add("기본 받침", `받침 ${bs.join("")} ${CIRCLED[s]}`, batchimMission(bs, s));
for (let s = 0; s < 5; s++) add("기본 받침", `받침 있는 글자 ${CIRCLED[s]}`, closedMission(s));

for (const cs of [["ㅋ", "ㅌ"], ["ㅍ", "ㅊ"]]) for (let s = 0; s < 3; s++) add("심화 자음", `자음 ${cs.join("")} ${CIRCLED[s]}`, strongMission(cs, s));
add("심화 자음", "자음 ㅋㅌㅍㅊ", strongMission(["ㅋ", "ㅌ", "ㅍ", "ㅊ"], 0, true));
for (const cs of [["ㄲ", "ㄸ", "ㅃ"], ["ㅆ", "ㅉ"]]) for (let s = 0; s < 3; s++) add("심화 자음", `자음 ${cs.join("")} ${CIRCLED[s]}`, strongMission(cs, s));
add("심화 자음", "자음 ㄲㄸㅃㅆㅉ", strongMission(["ㄲ", "ㄸ", "ㅃ", "ㅆ", "ㅉ"], 0, true));

for (const vs of [["ㅘ", "ㅝ", "ㅟ", "ㅢ"], ["ㅑ", "ㅕ", "ㅛ", "ㅠ"], ["ㅔ", "ㅐ"]]) for (let s = 0; s < 3; s++) add("심화 모음", `모음 ${vs.join("")} ${CIRCLED[s]}`, diphMission(vs, s));
add("심화 모음", "모음 ㅔㅐ 발전", diphMission(["ㅔ", "ㅐ"], 0, true));
for (let s = 0; s < 2; s++) add("심화 모음", `모음 ㅚㅙㅖㅒ ${CIRCLED[s]}`, diphMission(["ㅚ", "ㅙ", "ㅖ", "ㅒ"], s));
add("심화 모음", "모음 ㅚㅙㅖㅒ 발전", diphMission(["ㅚ", "ㅙ", "ㅖ", "ㅒ"], 0, true));

add("읽기 이해", "읽고 이해하기 ①", [read("explain", EXPLAIN.slice(0, 4)), read("find-me", FIND_ME.slice(0, 2)), quiz(read("explain", EXPLAIN.slice(4, 6)))]);
add("읽기 이해", "읽고 이해하기 ②", [read("find-me", FIND_ME.slice(2)), read("explain", EXPLAIN.slice(6)), quiz(read("find-me", FIND_ME.slice(0, 2)))]);
add("읽기 이해", "읽고 이해하기 ③", [read("read-answer", READ_ANSWER.slice(0, 2)), read("read-answer", READ_ANSWER.slice(2, 4)), quiz(read("read-answer", READ_ANSWER.slice(4)))]);

export const MISSIONS: Mission[] = list;
export const MISSION_GROUPS: string[] = uniq(list.map((m) => m.group));

export function missionOf(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}
