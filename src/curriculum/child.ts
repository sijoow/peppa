/**
 * 우리 아이 — 이름을 부르는 말("하온아", "하온이가 …")은 여기 이름을 쓴다.
 * 2026-10-26 사용자 요청: 아이 맞춤 앱이라 페파가 이름을 자주 불러 주기(성우 음성도 그 말로 굽는다).
 * 음성을 미리 굽기 때문에(Typecast) 이름은 고정 — 바꾸면 이름이 든 대사를 다시 구워야 한다(scripts/voice-lines).
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

export const CHILD = {
  /** 성까지 — 내 이름 쓰기 */
  full: "이하온",
  /** 부를 때 */
  call: "하온아",
  /** "하온이가", "하온이는" 처럼 뒤에 말을 붙일 때 */
  nick: "하온이",
} as const;

/** 내 이름 쓰기 — 한 글자씩(이·하·온) */
export const NAME_SYLLABLES: readonly string[] = [...CHILD.full];
