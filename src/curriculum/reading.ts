/**
 * 읽기 이해 놀이 글 — 자유 모드 '설명해 주세요·나를 찾아줘·읽고 답해요'와 미션 '읽고 이해하기'.
 * 토도 읽기 이해(5~6단계) 수준에 맞춰 짧은 글을 우리가 썼다. 그림은 낱말 사전(words.ts) 이모지.
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

/** 설명해 주세요 — 설명을 읽고 맞는 그림(낱말) 고르기 */
export const EXPLAIN: { text: string; answer: string; choices: string[] }[] = [
  { text: "빨갛고 동그란 과일이에요.", answer: "사과", choices: ["사과", "바나나", "포도"] },
  { text: "길고 노란 과일이에요. 원숭이가 좋아해요.", answer: "바나나", choices: ["딸기", "바나나", "수박"] },
  { text: "목이 아주 긴 동물이에요.", answer: "기린", choices: ["곰", "오리", "기린"] },
  { text: "코가 길고 몸이 아주 커요.", answer: "코끼리", choices: ["코끼리", "토끼", "고양이"] },
  { text: "추울 때 발에 신어요.", answer: "양말", choices: ["모자", "양말", "피자"] },
  { text: "하얗고 고소한 마실 거예요.", answer: "우유", choices: ["빵", "사탕", "우유"] },
  { text: "귀가 길고 깡충깡충 뛰어요.", answer: "토끼", choices: ["토끼", "사자", "오리"] },
  { text: "밤하늘에서 반짝반짝 빛나요.", answer: "별", choices: ["해", "별", "꽃"] },
];

/** 나를 찾아줘 — 문장을 읽고 그림 속 친구 찾기. 보기는 '동물+물건' 이모지 둘 */
export const FIND_ME: { text: string; answer: string; choices: string[] }[] = [
  { text: "모자를 쓴 곰을 찾아줘.", answer: "🐻🧢", choices: ["🐰🧢", "🐻🧢", "🐻🎀", "🐶🧢"] },
  { text: "꽃을 든 토끼를 찾아줘.", answer: "🐰🌸", choices: ["🐰🎈", "🐱🌸", "🐰🌸", "🐻🌸"] },
  { text: "풍선을 든 고양이를 찾아줘.", answer: "🐱🎈", choices: ["🐱🎈", "🐶🎈", "🐱🍎", "🐰🎈"] },
  { text: "사과를 든 강아지를 찾아줘.", answer: "🐶🍎", choices: ["🐶🍌", "🐻🍎", "🐱🍎", "🐶🍎"] },
  { text: "안경을 쓴 오리를 찾아줘.", answer: "🦆👓", choices: ["🦆🧢", "🦆👓", "🐧👓", "🐸👓"] },
];

/** 읽고 답해요 — 짧은 글 + 물음 */
export const READ_ANSWER: { text: string; question: string; answer: string; choices: string[] }[] = [
  { text: "페파는 아침에 일어나서 세수를 했어요. 그리고 우유를 마셨어요.", question: "페파는 무엇을 마셨나요?", answer: "우유", choices: ["주스", "우유", "물"] },
  { text: "페파와 토끼가 공원에 갔어요. 페파는 그네를 탔어요. 토끼는 미끄럼틀을 탔어요.", question: "토끼는 무엇을 탔나요?", answer: "미끄럼틀", choices: ["미끄럼틀", "그네", "자전거"] },
  { text: "오늘은 비가 와요. 조지는 노란 우산을 썼어요.", question: "조지의 우산은 무슨 색인가요?", answer: "노란색", choices: ["빨간색", "파란색", "노란색"] },
  { text: "엄마가 맛있는 김밥을 만들었어요. 우리 가족은 소풍을 갔어요.", question: "엄마는 무엇을 만들었나요?", answer: "김밥", choices: ["김밥", "피자", "케이크"] },
  { text: "고양이는 낮잠을 자고 있어요. 강아지가 공을 가지고 왔어요.", question: "누가 공을 가지고 왔나요?", answer: "강아지", choices: ["고양이", "오리", "강아지"] },
];
