/**
 * 한글 글자 조합 — 자음 + 모음 (+ 받침) → 글자, 글자 → 자모.
 * 유니코드 한글 음절은 (초성 × 21 + 중성) × 28 + 종성 + 0xAC00 이라 규칙으로 만들 수 있다.
 * 글자 만들기 놀이(돌려라 글자판·모여라 자음 모음·마법의 솥)와 타자 연습이 쓴다.
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

export const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
export const JUNG = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
export const JONG = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

const BASE = 0xac00;

/** 자음 + 모음 (+ 받침) → 글자. 맞지 않는 조합이면 null */
export function compose(cho: string, jung: string, jong = ""): string | null {
  const c = CHO.indexOf(cho);
  const j = JUNG.indexOf(jung);
  const t = JONG.indexOf(jong);
  if (c < 0 || j < 0 || t < 0) return null;
  return String.fromCharCode(BASE + (c * 21 + j) * 28 + t);
}

export function isSyllable(ch: string): boolean {
  if (ch.length !== 1) return false;
  const code = ch.charCodeAt(0);
  return code >= BASE && code <= 0xd7a3;
}

/** 낱말이 모두 한글 글자로만 되어 있는지 (띄어쓰기 없이) */
export function isHangulWord(s: string): boolean {
  return s.length > 0 && [...s].every(isSyllable);
}

export function decompose(ch: string): { cho: string; jung: string; jong: string } | null {
  if (!isSyllable(ch)) return null;
  const n = ch.charCodeAt(0) - BASE;
  return { cho: CHO[Math.floor(n / 588)], jung: JUNG[Math.floor((n % 588) / 28)], jong: JONG[n % 28] };
}

/** 세로 모음(ㅏ ㅓ ㅣ …)은 자음 오른쪽, 가로 모음(ㅗ ㅜ ㅡ …)은 자음 아래에 붙는다 */
export function vowelSide(jung: string): "right" | "below" | "both" {
  if (["ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ"].includes(jung)) return "below";
  if (["ㅘ", "ㅙ", "ㅚ", "ㅝ", "ㅞ", "ㅟ", "ㅢ"].includes(jung)) return "both";
  return "right";
}

/** 받침 없는 글자들 — 자음 목록 × 모음 목록 */
export function syllableGrid(consonants: string[], vowels: string[]): string[] {
  return consonants.flatMap((c) => vowels.map((v) => compose(c, v)).filter((s): s is string => s !== null));
}
