/** 활동 하나를 마쳤을 때 — 점수 활동은 첫 시도에 맞힌 수, 나머지는 0/0 */
export interface ActivityResult {
  correct: number;
  total: number;
}

export type OnDone = (r: ActivityResult) => void;
