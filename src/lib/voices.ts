/**
 * 성우 — Typecast 목소리 두 개. 소리 파일은 목소리마다 따로 구워 둔다(scripts/typecast.mts).
 * 아이디마다 설정(settings.voice)으로 고른다 — 부모·관리자 페이지 '프로그램 관리'.
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

export const VOICES = [
  { id: "minjeong", name: "민정" },
  { id: "sua", name: "수아" },
] as const;

export type VoiceId = (typeof VOICES)[number]["id"];

// 2026-10-26 사용자 선택 — 일단 수아 한 목소리로 구워서 쓴다(민정은 시험 12줄만)
export const DEFAULT_VOICE: VoiceId = "sua";

export function isVoiceId(v: unknown): v is VoiceId {
  return VOICES.some((x) => x.id === v);
}
