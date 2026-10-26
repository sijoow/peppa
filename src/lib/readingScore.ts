/**
 * 읽기 코칭 판정 — 음성 인식이 들은 말(후보 여러 개)과 책 글을 글자 단위로 비교한다.
 * 4살 발음은 인식이 잘 안 되므로 너그럽게(60%면 통과), 못 읽은 낱말은 따로 알려 준다.
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

export const READ_PASS = 0.6;

/** 한글 글자만 남긴다 — 띄어쓰기·문장부호·숫자는 비교에서 뺀다 */
export function hangulOnly(s: string): string {
  return s.replace(/[^가-힣]/g, "");
}

/** 글자 단위 편집 거리로 본 닮음 (0~1) */
export function similarity(a: string, b: string): number {
  const x = [...hangulOnly(a)];
  const y = [...hangulOnly(b)];
  if (x.length === 0 && y.length === 0) return 1;
  const d = Array.from({ length: x.length + 1 }, (_, i) => Array.from({ length: y.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
  }
  return 1 - d[x.length][y.length] / Math.max(x.length, y.length);
}

/** 가장 닮은 후보로 점수 매기고, 그 후보에 안 들어 있는 낱말을 '못 읽은 낱말'로 */
export function scoreReading(target: string, heard: string[]): { score: number; pass: boolean; missing: string[] } {
  const best = heard.reduce((b, h) => (similarity(target, h) > similarity(target, b) ? h : b), heard[0] ?? "");
  const score = heard.length ? similarity(target, best) : 0;
  const flat = hangulOnly(best);
  const missing = target
    .split(/\s+/)
    .map(hangulOnly)
    .filter((w) => w && !flat.includes(w));
  return { score, pass: score >= READ_PASS, missing };
}
