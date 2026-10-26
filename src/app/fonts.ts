/*
 * 글꼴 — 프리텐다드 하나(앱에서 가장 흔히 쓰는 글꼴, 한글 모양은 본고딕과 같은 반듯한 표준 고딕).
 *   아이가 글씨를 배우는 앱이라 모든 글자를 같은 모양으로 — 2026-10-26 사용자 요청
 *   글꼴 파일은 앱이 직접 들고 있고(layout 이 pretendard 패키지 CSS 를 불러온다), 글자 조각마다 나뉘어 있어서 화면에 나온 글자 조각만 내려받는다.
 *   역할은 굵기로 나눈다(globals.css): 화면 글씨 800 · 본문 600 · 배우는 글자 700
 */

/** 캔버스에 글자를 그릴 때(따라쓰기·색칠·그리기 판) 쓰는 글꼴 이름 */
export const LETTER_FAMILY = `"Pretendard Variable", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
