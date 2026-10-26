/**
 * 아이에게 들려주는 안내 말 — 한곳에 모아 둔다.
 * Typecast(민정) 음성을 미리 만들 때 이 목록 + 글자 이름 + 낱말 + 책 글을 그대로 뽑아 간다(scripts/voice-lines.mts).
 * 이름을 끼워 넣은 문장("기역을 찾아 봐")은 조합마다 녹음이 따로 필요해서 만들지 않는다 —
 * 대신 짧은 말을 이어서 들려준다: "기역" → "어디 있을까?".
 * 아이 이름(curriculum/child)은 고정이라 이름을 부르는 말("하온아, …")은 그대로 굽는다 — 아이 맞춤(2026-10-26 사용자 요청).
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

import { CHILD } from "./child.ts";

const { call, nick } = CHILD;

export const LINES = {
  greet: `안녕, ${call}! 나는 페파야. 오늘도 같이 한글 놀이 하자!`,
  /** 첫 화면 페파를 누르면 — 차례로 하나씩 */
  hello: [`${call}, 오늘 같이 모험 떠나 볼래?`, `${call}, 반가워! 오늘은 어떤 글자를 만날까?`, `${nick}랑 노는 게 제일 좋아!`, `${call}, 준비됐니? 출발!`],
  sessionStart: `${call}, 오늘의 모험을 시작해 볼까?`,
  sessionEnd: `오늘의 모험 끝! ${nick} 정말 잘했어!`,
  doneToday: `오늘 모험은 끝! ${call}, 내일 또 만나!`,
  assessPass: `확인 놀이 통과! ${nick} 정말 대단해!`,
  assessReview: "조금 더 같이 놀면서 연습하자!",
  fireflies: "반딧불이를 모았어!",
  locked: "조금 더 배우면 열려!",

  tapPop: "방울을 톡톡 터뜨려 봐!",
  introJamo: "글자 친구를 만나 볼까?",
  introWord: "낱말 카드를 같이 볼까?",
  listenChoose: "잘 듣고 골라 봐!",
  whereIs: "어디 있을까?",
  findSame: "똑같은 모양을 찾아 봐!",
  dragJamo: "글자를 꾹 눌러서 같은 그림자에 쏙 넣어 봐!",
  dragWord: "낱말을 꾹 눌러서 맞는 그림에 쏙 넣어 봐!",
  trace: "손가락으로 글자를 따라 써 봐!",
  freeWrite: "잘 보고 기억해서 혼자 써 봐!",
  clap: "잘 듣고, 소리 나는 만큼 짝짝 쳐 봐!",
  clapHowMany: "몇 번 짝짝 칠까?",
  wordPicture: "이 낱말은 어떤 그림일까?",
  book: "오늘의 책을 읽어 줄게!",
  bookEnd: "끝! 재미있었지?",

  diagIntro: "어떤 글자를 아는지 같이 알아볼까?",
  diagListen: "잘 듣고 맞는 글자를 골라 봐!",
  diagDone: `다 했어! ${nick} 끝까지 해서 정말 멋져!`,
  next: "다음!",
  studio: `${call}, 오늘은 무엇을 그려 볼까?`,
  free: `${call}, 무슨 놀이를 해 볼까?`,
  mine: "글자 광산이야! 들은 글자가 든 바위를 톡톡 쳐 봐!",
  mineHit1: "으랏차!",
  mineHit2: "한 번 더!",
  station: "버스 손님이 말한 소리는 어느 정류장일까?",
  soccer: "들은 낱말이 적힌 골대로 공을 차 봐!",
  goal: "골인!",
  keeperSave: "아빠가 막았어!",
  explain: "설명을 읽고 맞는 그림을 골라 봐!",
  findMe: "문장을 읽고 친구를 찾아 줘!",
  readAnswer: "글을 읽고 물음에 답해 봐!",
  pieces: "글자 조각을 차례대로 붙여 봐!",
  wheel: "글자판을 돌려서 들은 글자를 만들어 봐!",
  assemble: "자음과 모음을 제자리에 넣어 글자를 완성해 봐!",
  cauldron: "자음 하나, 모음 하나를 솥에 넣고 저어 봐!",
  rhythm: "박자에 맞춰 글자가 오면 톡 쳐 봐!",
  wordCard: "그림 낱말을 따라 쓰고 카드를 모아 봐!",
  soundFirst: "처음 소리가 같은 그림을 찾아봐!",
  soundLast: "끝소리가 같은 그림을 찾아봐!",
  sameFirstQ: "처음 소리가 같은 건?",
  sameLastQ: "끝소리가 같은 건?",
  blend: "나눠서 말한 소리를 합쳐 볼까?",
  blendQ: "합치면 뭐가 될까?",
  missions: `${call}, 어떤 도전을 해 볼까?`,
  galaxy: `${call}, 우주 여행을 떠나 볼까?`,
  galaxyTired: "오늘 여행은 다 했어! 내일 또 떠나자!",
  galaxyClear: `행성 통과! ${nick} 우주 최고야!`,
  galaxyFail: "아쉬워! 다시 도전해 보자!",
  reading: `${call}, 어떤 책을 읽어 볼까?`,
  coachIntro: "페파가 먼저 읽어 줄게. 그다음에 따라 읽어 봐!",
  coachListen: "이제 소리 내어 읽어 봐!",
  coachGood: `와, ${nick} 정말 잘 읽었어!`,
  coachAgain: "다시 한번 읽어 볼까?",
  recordIntro: "또박또박 읽으면서 녹음해 봐!",
  recordDone: `${nick} 목소리 책이 완성됐어!`,
  badge: `배지를 받았어! ${nick} 정말 대단해!`,
  /** 작업실 쓰기 연습의 '내 이름을 써 봐요' */
  myName: `${call}, 네 이름을 써 볼까?`,
  makeThis: "이 글자를 만들어 볼까?",
  made: "이 글자가 됐어!",
  studioLocked: "반딧불이를 더 모으면 열려!",

  revealHere: "여기 있었네!",
  praise: ["잘했어!", "맞았어!", "최고야!", "우와, 멋지다!", `${nick} 최고야!`, `잘했어, ${call}!`],
  retry: ["다시 해 볼까?", "한 번 더 해 보자!"],
} as const;

/** 모든 안내 말을 한 줄씩 — 음성 파일 목록을 뽑을 때 쓴다 */
export function allLineTexts(): string[] {
  return Object.values(LINES).flatMap((v) => (typeof v === "string" ? [v] : [...v]));
}
