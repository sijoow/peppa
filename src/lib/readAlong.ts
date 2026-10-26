/**
 * 노래방 읽기 — 성우가 지금 어디를 읽는지 글자 단위로 계산한다(components/ReadAlong 이 색을 바꾼다).
 * 음성 파일의 말소리 구간(content/voice-timing.json, scripts/voice-timing.mts)과 글을 맞춘다:
 *   문장부호(! . , ? ~)로 나눈 조각 수 = 말소리 구간 수 → 조각마다 그 구간에 글자를 고르게 나눈다
 *   구간이 더 많으면 → 사이가 가장 짧은 구간끼리 합쳐서 수를 맞춘다
 *   구간이 더 적으면 → 말소리 구간을 이어 붙인 시간에 글자를 고르게(쉬는 동안은 색이 멈춘다)
 * 구간 자료가 없으면(기기 음성) 어림한 길이(estimate)에 고르게.
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

/** 소리 내는 글자 — 한글 음절·자모, 영문·숫자 */
const SOUND = /[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9]/;
const STOP = /[.,!?~…]/;
/** 글자 칸의 어디쯤에서 색을 바꿀지 — 칸 시작보다 조금 뒤(소리가 들린 다음) */
const LEAD = 0.15;

type Seg = readonly [number, number];

/** 문장부호에서 끊은 조각마다 소리 내는 글자 자리 — "!?" "…" 처럼 이어진 부호는 마지막에서 끊는다 */
function phrasesOf(chars: string[]): number[][] {
  const out: number[][] = [];
  let cur: number[] = [];
  chars.forEach((ch, i) => {
    if (SOUND.test(ch)) cur.push(i);
    const next = chars[i + 1];
    if (STOP.test(ch) && (next === undefined || !STOP.test(next)) && cur.length) {
      out.push(cur);
      cur = [];
    }
  });
  if (cur.length) out.push(cur);
  return out;
}

/** 사이가 가장 짧은 구간끼리 합쳐서 n 개로 */
function mergeTo(segs: Seg[], n: number): Seg[] {
  const s = segs.map((x) => [x[0], x[1]] as const);
  while (s.length > n && s.length > 1) {
    let best = 0;
    for (let i = 1; i < s.length - 1; i++) if (s[i + 1][0] - s[i][1] < s[best + 1][0] - s[best][1]) best = i;
    s.splice(best, 2, [s[best][0], s[best + 1][1]]);
  }
  return s;
}

/** 말소리만 이어 붙인 시간 τ → 실제 시각 */
function realTime(segs: Seg[], tau: number): number {
  let left = tau;
  for (const [a, b] of segs) {
    if (left <= b - a) return a + left;
    left -= b - a;
  }
  return segs.length ? segs[segs.length - 1][1] : tau;
}

/**
 * 글자마다 색이 바뀌는 시각(초, 그 말을 읽기 시작한 때부터).
 * 소리 안 나는 글자(띄어쓰기·문장부호)는 바로 앞 글자와 같이 바뀐다.
 */
export function charTimes(text: string, segs: readonly (readonly number[])[] | null, estimate = 0): number[] {
  const chars = [...text];
  const times: number[] = Array.from({ length: chars.length }, () => Number.NaN);
  const phrases = phrasesOf(chars);
  const sounds = phrases.flat();
  const spread = (idx: number[], from: number, to: number) => {
    const step = (to - from) / Math.max(1, idx.length);
    idx.forEach((ci, k) => (times[ci] = from + step * (k + LEAD)));
  };
  const clean = (segs ?? []).filter((s) => s.length >= 2 && s[1] > s[0]).map((s) => [s[0], s[1]] as const);

  if (clean.length === 0) {
    spread(sounds, 0, estimate > 0 ? estimate : sounds.length * 0.3);
  } else {
    const merged = mergeTo(clean, phrases.length);
    if (merged.length === phrases.length) {
      phrases.forEach((p, i) => spread(p, merged[i][0], merged[i][1]));
    } else {
      const total = clean.reduce((n, [a, b]) => n + b - a, 0);
      const step = total / Math.max(1, sounds.length);
      sounds.forEach((ci, k) => (times[ci] = realTime(clean, step * (k + LEAD))));
    }
  }

  // 소리 안 나는 글자는 앞 글자를 따라간다(맨 앞이면 첫 소리 글자와 같이)
  const first = times.find((t) => !Number.isNaN(t)) ?? 0;
  let prev = first;
  return times.map((t) => (Number.isNaN(t) ? prev : (prev = t)));
}

/** 시각 t 까지 색이 바뀐 글자 수 */
export function litCount(times: readonly number[], t: number): number {
  let n = 0;
  while (n < times.length && times[n] <= t) n++;
  return n;
}
