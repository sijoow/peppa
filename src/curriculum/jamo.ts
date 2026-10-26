/**
 * 자음·모음과 그 이름. 1단원은 글자 '이름'을 먼저 익힌다(기역, 니은 …).
 * 소리(그, 느 …)는 3단원 파닉스부터 — 그때 sound 를 채운다.
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

export interface Jamo {
  char: string;
  name: string;
  type: "consonant" | "double" | "vowel" | "compound";
}

export const CONSONANTS: Jamo[] = [
  { char: "ㄱ", name: "기역", type: "consonant" },
  { char: "ㄴ", name: "니은", type: "consonant" },
  { char: "ㄷ", name: "디귿", type: "consonant" },
  { char: "ㄹ", name: "리을", type: "consonant" },
  { char: "ㅁ", name: "미음", type: "consonant" },
  { char: "ㅂ", name: "비읍", type: "consonant" },
  { char: "ㅅ", name: "시옷", type: "consonant" },
  { char: "ㅇ", name: "이응", type: "consonant" },
  { char: "ㅈ", name: "지읒", type: "consonant" },
  { char: "ㅊ", name: "치읓", type: "consonant" },
  { char: "ㅋ", name: "키읔", type: "consonant" },
  { char: "ㅌ", name: "티읕", type: "consonant" },
  { char: "ㅍ", name: "피읖", type: "consonant" },
  { char: "ㅎ", name: "히읗", type: "consonant" },
];

export const DOUBLE_CONSONANTS: Jamo[] = [
  { char: "ㄲ", name: "쌍기역", type: "double" },
  { char: "ㄸ", name: "쌍디귿", type: "double" },
  { char: "ㅃ", name: "쌍비읍", type: "double" },
  { char: "ㅆ", name: "쌍시옷", type: "double" },
  { char: "ㅉ", name: "쌍지읒", type: "double" },
];

export const VOWELS: Jamo[] = [
  { char: "ㅏ", name: "아", type: "vowel" },
  { char: "ㅑ", name: "야", type: "vowel" },
  { char: "ㅓ", name: "어", type: "vowel" },
  { char: "ㅕ", name: "여", type: "vowel" },
  { char: "ㅗ", name: "오", type: "vowel" },
  { char: "ㅛ", name: "요", type: "vowel" },
  { char: "ㅜ", name: "우", type: "vowel" },
  { char: "ㅠ", name: "유", type: "vowel" },
  { char: "ㅡ", name: "으", type: "vowel" },
  { char: "ㅣ", name: "이", type: "vowel" },
];

export const COMPOUND_VOWELS: Jamo[] = [
  { char: "ㅐ", name: "애", type: "compound" },
  { char: "ㅒ", name: "얘", type: "compound" },
  { char: "ㅔ", name: "에", type: "compound" },
  { char: "ㅖ", name: "예", type: "compound" },
  { char: "ㅘ", name: "와", type: "compound" },
  { char: "ㅙ", name: "왜", type: "compound" },
  { char: "ㅚ", name: "외", type: "compound" },
  { char: "ㅝ", name: "워", type: "compound" },
  { char: "ㅞ", name: "웨", type: "compound" },
  { char: "ㅟ", name: "위", type: "compound" },
  { char: "ㅢ", name: "의", type: "compound" },
];

const ALL = [...CONSONANTS, ...DOUBLE_CONSONANTS, ...VOWELS, ...COMPOUND_VOWELS];
const BY_CHAR = new Map(ALL.map((j) => [j.char, j]));

export function jamoOf(char: string): Jamo | undefined {
  return BY_CHAR.get(char);
}

export function isJamo(s: string): boolean {
  return BY_CHAR.has(s);
}
