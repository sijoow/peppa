/**
 * 단원 찾기 퀴즈 — 토도 '현재 수준' 6가지(시작 1·3·5·7·9·12단원)를 문제로 가린다.
 * 토도 사용법 페이지의 수준 설명을 그대로 문제로: '사·고리·버무'를 읽는지, '담·보석·돌모'를 읽는지,
 * ㄱ/ㅋ/ㄲ·ㅔ/ㅐ 를 가리는지, '부엌·늦어요'를 아는지. (버무·돌모는 뜻 없는 글자 — 외운 낱말이 아니라 읽는지 본다)
 * 단계마다 5문제, 4개 맞히면 다음 단계. 못 넘은 단계의 단원부터 시작, 다 넘으면 12단원(퀴즈로만 열린다).
 * 순수 파일 — node --test 가 그대로 읽는다.
 */

export interface DiagItem {
  /** 들려줄 말 */
  say: string;
  choices: string[];
  answer: string;
  /** 소리로는 같은 글자(개/게)일 때 뜻을 알려 줄 그림 */
  pic?: string;
}

export interface DiagLevel {
  /** 이 단계를 못 넘으면 시작할 단원 */
  unit: number;
  title: string;
  items: DiagItem[];
}

const I = (say: string, choices: string[], pic?: string): DiagItem => ({ say, choices, answer: say, ...(pic ? { pic } : {}) });

export const DIAG_LEVELS: DiagLevel[] = [
  {
    unit: 1,
    title: "글자 이름",
    items: [
      { say: "기역", choices: ["ㄴ", "ㄱ", "ㄷ"], answer: "ㄱ" },
      { say: "미음", choices: ["ㅁ", "ㅂ", "ㅇ"], answer: "ㅁ" },
      { say: "시옷", choices: ["ㅈ", "ㅊ", "ㅅ"], answer: "ㅅ" },
      { say: "히읗", choices: ["ㅎ", "ㅇ", "ㅍ"], answer: "ㅎ" },
      { say: "아", choices: ["ㅓ", "ㅏ", "ㅗ"], answer: "ㅏ" },
    ],
  },
  {
    unit: 3,
    title: "받침 없는 글자 읽기",
    items: [I("사", ["소", "사", "서"]), I("고리", ["구리", "거리", "고리"]), I("버무", ["버무", "보무", "부무"]), I("나비", ["너비", "나비", "누비"]), I("도라", ["두라", "다라", "도라"])],
  },
  {
    unit: 5,
    title: "받침 글자 읽기",
    items: [I("담", ["담", "단", "다"]), I("보석", ["보서", "부석", "보석"]), I("곰", ["공", "곰", "고"]), I("돌모", ["돌모", "도모", "돈모"]), I("밥", ["방", "바", "밥"])],
  },
  {
    unit: 7,
    title: "비슷한 글자 가리기",
    items: [I("코", ["고", "코", "꼬"]), I("개", ["개", "게"], "🐶"), I("딸기", ["달기", "탈기", "딸기"]), I("게", ["개", "게"], "🦀"), I("빵", ["방", "팡", "빵"])],
  },
  {
    unit: 9,
    title: "소리와 글자가 다른 받침",
    items: [I("부엌", ["부억", "부엌", "부얶"], "🍳"), I("늦어요", ["느저요", "늦어요", "늗어요"], "⏰"), I("꽃이", ["꼬치", "꽃이", "꼿이"], "🌸"), I("옷을", ["오슬", "옷을", "옫을"], "👕"), I("밖에", ["바께", "박에", "밖에"], "🏞️")],
  },
];

export const DIAG_PASS = 4;
/** 다 넘으면 */
export const DIAG_TOP_UNIT = 12;

export interface DiagState {
  level: number;
  /** 이 단계에서 답한 수 */
  answered: number;
  correct: number;
  /** 끝났으면 추천 단원 */
  result: number | null;
}

export function diagStart(): DiagState {
  return { level: 0, answered: 0, correct: 0, result: null };
}

export function diagItem(s: DiagState): DiagItem | null {
  if (s.result !== null) return null;
  return DIAG_LEVELS[s.level]?.items[s.answered] ?? null;
}

/** 답 하나 — 넘을 수 없게 되면 바로 끝낸다(아이를 오래 붙잡지 않게) */
export function diagAnswer(s: DiagState, ok: boolean): DiagState {
  if (s.result !== null) return s;
  const level = DIAG_LEVELS[s.level];
  const answered = s.answered + 1;
  const correct = s.correct + (ok ? 1 : 0);
  const wrong = answered - correct;
  if (wrong > level.items.length - DIAG_PASS) return { level: s.level, answered, correct, result: level.unit };
  if (answered < level.items.length) return { level: s.level, answered, correct, result: null };
  // 이 단계를 넘었다
  if (s.level + 1 >= DIAG_LEVELS.length) return { level: s.level, answered, correct, result: DIAG_TOP_UNIT };
  return { level: s.level + 1, answered: 0, correct: 0, result: null };
}
