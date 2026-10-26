/**
 * 힉스필드 프롬프트 — scripts/image-list.json 의 그림마다 모델 설정·레퍼런스 묶음·프롬프트·저장 파일을 정한다.
 *   npm run image:list && npm run image:prompts   → scripts/image-prompts.json
 * 모델은 GPT Image 2.5 medium(2026-10-26 시안에서 페파 그림체에 가장 충실).
 *   인물·사물·낱말·아이콘 = 1:1 1k 바탕 투명(장당 0.5크레딧) · 책 장면 = 1:1 2k · 색칠 선 그림 = 4:3 2k(장당 1크레딧)
 * refs 는 레퍼런스 묶음 이름 — 생성할 때 업로드한 그림으로 바꿔 넣는다:
 *   cast   = refs/인물도.png + 가족 장면(34.jpg·2.jpg)
 *   rabbit = 시안 토끼(drafts/2026-10-26/gpt-4-rabbit-shop.png) + 인물도
 *   animal = 시안 토끼 + 부두 장면(2.jpg)
 *   object = 시안 사과(drafts/2026-10-26/gpt-1-apple.png) + 부두 장면(2.jpg)
 *   scene  = 가족 장면(34.jpg) + 부두 장면(2.jpg) — 인물 없는 화면 바탕용
 * 첫 화면 바탕(bg:home)은 시안 gpt-3-home-bg 를 그대로 쓰므로 여기서 뺀다.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { CAST } from "../src/curriculum/cast.ts";
import { WORDS } from "../src/curriculum/words.ts";

type Refs = "cast" | "rabbit" | "animal" | "object" | "scene";
type Params = { model: "gpt_image_2_5"; quality: "medium"; resolution: "1k" | "2k"; aspect_ratio: "1:1" | "4:3" | "16:9"; background: "transparent" | "opaque" };
type Item = { key: string; file: string; refs: Refs; params: Params; prompt: string };

const list = JSON.parse(readFileSync(new URL("./image-list.json", import.meta.url), "utf8")) as Record<string, { key: string; what: string; who?: string }[]>;

const STYLE =
  "Peppa Pig cartoon style, exactly like the reference images: flat 2D, simple rounded shapes, solid flat colours, no gradients, no shading, thin outlines slightly darker than each fill colour, cheerful colours, minimal detail. No text, letters or numbers anywhere.";
const CUTOUT = "Centred with a small margin, fully transparent background, no ground, no shadow.";
const AS_REF = "Draw the characters exactly as in the reference images: same faces, same clothes, side profile with both eyes on the same side, like the show.";

const cutout = (resolution: "1k" = "1k"): Params => ({ model: "gpt_image_2_5", quality: "medium", resolution, aspect_ratio: "1:1", background: "transparent" });
const scene: Params = { model: "gpt_image_2_5", quality: "medium", resolution: "2k", aspect_ratio: "1:1", background: "opaque" };
const page: Params = { model: "gpt_image_2_5", quality: "medium", resolution: "2k", aspect_ratio: "4:3", background: "opaque" };

/** 낱말 그림 — 인물 낱말(엄마·아빠·할머니·할아버지·토끼)은 인물로, 동물은 쇼의 동물 친구처럼 */
const WORD_EN: Record<string, string> = {
  사과: "a red apple", 바나나: "a yellow banana", 포도: "a bunch of purple grapes", 딸기: "a red strawberry", 수박: "a round watermelon with a red slice",
  당근: "an orange carrot", 오이: "a green cucumber", 감자: "a brown potato", 밥: "a bowl of white rice", 빵: "a loaf of bread",
  우유: "a carton of milk", 국수: "a bowl of noodles", 달걀: "a white egg", 피자: "a round pizza", 과자: "a few round cookies", 사탕: "a wrapped sweet candy",
  강아지: "a puppy", 고양이: "a kitten", 곰: "a bear", 사자: "a lion", 기린: "a giraffe", 오리: "a duck", 코끼리: "an elephant",
  아기: "a baby piglet in a nappy holding a rattle", 모자: "a blue cap", 양말: "a pair of striped socks", 신발: "a pair of sneakers",
  배: "a yellow pear", 말: "a horse", 소: "a cow", 별: "a yellow star", 달: "a crescent moon", 꽃: "a pink flower", 해: "a smiling yellow sun",
  하마: "a hippo", 시계: "an alarm clock", 버스: "a red bus", 원숭이: "a monkey", 호랑이: "a tiger", 비행기: "an aeroplane",
  귤: "a tangerine", 복숭아: "a peach", 레몬: "a lemon", 체리: "a pair of cherries", 토마토: "a red tomato", 호박: "an orange pumpkin",
  옥수수: "a corn cob", 고추: "a red chilli pepper", 버섯: "a mushroom", 브로콜리: "a broccoli", 돼지: "a little pink pig",
  여우: "a fox", 펭귄: "a penguin", 거북이: "a turtle", 개구리: "a green frog", 다람쥐: "a squirrel", 부엉이: "an owl", 양: "a fluffy sheep",
  용: "a friendly green dragon", 새: "a little bird", 게: "a red crab", 개: "a dog", 개미: "an ant", 거미: "a friendly spider", 나비: "a butterfly",
  문어: "an octopus", 고래: "a blue whale", 쥐: "a mouse", 염소: "a goat",
  케이크: "a birthday cake", 아이스크림: "an ice cream cone", 고기: "a piece of meat on the bone", 주스: "a juice box with a straw",
  치즈: "a wedge of cheese", 꿀: "a pot of honey", 바지: "a pair of trousers", 치마: "a skirt", 장갑: "a pair of mittens", 티셔츠: "a T-shirt",
  코트: "a coat", 목도리: "a striped scarf", 안경: "a pair of glasses", 가방: "a school backpack", 구두: "a pair of shoes", 지갑: "a purse",
  기차: "a toy steam train", 자동차: "a little red car", 트럭: "a truck", 바다: "the blue sea with waves", 산: "a mountain", 비: "a rain cloud with raindrops",
  눈: "a snowman in falling snow", 나무: "a round green tree", 풀: "a tuft of green grass", 밤: "a chestnut", 공: "a football", 책: "a picture book",
  약: "a bottle of medicine with a spoon", 집: "Peppa's yellow house with a red roof", 문: "a front door", 손: "a hand", 발: "a foot", 입: "a smiling mouth",
  귀: "an ear", 코: "a nose", 물: "a drop of water", 돈: "coins and a banknote", 컵: "a cup", 우산: "an umbrella", 의자: "a chair",
  야구: "a baseball and bat", 요요: "a yo-yo", 스키: "a pair of skis", 드럼: "a drum", 피아노: "a piano", 로봇: "a toy robot", 왕관: "a golden crown",
  열쇠: "a key", 연필: "a pencil", 공책: "a notebook", 풍선: "a red balloon", 선물: "a gift box with a bow", 텐트: "a tent", 카메라: "a camera",
  외계인: "a friendly little alien", 유령: "a friendly little ghost", 사람: "a smiling child", 박수: "two clapping hands", 포크: "a fork", 도끼: "an axe",
  컴퓨터: "a computer", 키위: "a kiwi fruit cut in half", 씨앗: "a seed sprouting a tiny green shoot", 똥: "a cute smiling swirl of poo",
};
const ANIMALS = new Set(["강아지", "고양이", "곰", "사자", "기린", "오리", "코끼리", "말", "소", "하마", "원숭이", "호랑이", "돼지", "여우", "펭귄", "거북이", "개구리", "다람쥐", "부엉이", "양", "용", "새", "게", "개", "개미", "거미", "나비", "문어", "고래", "쥐", "염소", "외계인", "유령"]);
const PEOPLE = new Set(["아기", "사람"]);

/** 아이콘 사물 — 지금 이모지 뜻 그대로 */
const ICON_EN: Record<string, string> = {
  "free:sound-station": "a red bus next to a bus stop sign", "free:letter-mine": "a pickaxe next to a sparkly rock", "free:letter-wheel": "a colourful spinning prize wheel",
  "free:trace": "a yellow pencil drawing a dotted line", "free:free-write": "a notepad with a pencil", "free:word-card": "a small fan of picture cards",
  "free:rhythm": "a red toy drum with two drumsticks", "free:assemble": "two jigsaw puzzle pieces fitting together", "free:cauldron": "a bubbling magic cauldron with sparkles",
  "free:word-soccer": "a football in front of a small goal", "free:listen-pick": "a pair of headphones", "free:pieces": "a glue stick with paper pieces",
  "free:explain": "an empty round speech bubble", "free:find-me": "a magnifying glass", "free:read-answer": "an open picture book",
  "studio:draw": "a handful of crayons", "studio:color": "a paint palette with a brush", "studio:letter-color": "a set of colouring pencils",
  "studio:word-write": "a pencil writing on lined paper", "studio:sentence-write": "a rolled paper scroll with a feather quill", "studio:card": "a pink envelope with a heart",
  "galaxy:pick": "a ringed planet", "galaxy:type-1": "a colourful toy keyboard", "galaxy:word-quiz": "a shining star", "galaxy:word-find-1": "a telescope",
  "galaxy:type-2": "a red-and-white rocket", "galaxy:word-find-2": "a comet with a sparkly tail",
  "reading:coach": "a microphone", "reading:record": "a cassette tape", "reading:books": "a stack of picture books",
  "mission:badge": "a gold medal on a ribbon", "mission:target": "a target with an arrow in the middle", firefly: "a cute little firefly with a softly glowing yellow tail, smiling",
};
const MENU_EN: Record<string, string> = {
  free: "Peppa Pig jumping in a muddy puddle with a big splash, full body",
  missions: "George Pig proudly wearing a shiny gold medal on a ribbon, full body",
  galaxy: "George Pig in a space helmet riding a small red-and-white toy rocket",
  reading: "Peppa Pig holding an open picture book and reading aloud, full body",
  studio: "Mummy Pig painting with a paintbrush and a colourful palette, full body",
  diagnose: "Daddy Pig looking through a big magnifying glass, full body",
};
const MASCOT_EN: Record<string, string> = {
  mascot: "Peppa Pig standing and waving hello with one hand, big happy smile, full body",
  "mascot:cheer": "Peppa Pig jumping for joy with both arms up, very happy, full body",
  "mascot:wow": "Peppa Pig looking amazed with her mouth in a little round 'o' and both hands on her cheeks, full body",
};
const SCENE_EN: Record<string, string> = {
  "book:letters-1:4": "Peppa Pig waving hello happily on a green hill under a blue sky, as if greeting new friends",
  "book:letters-2:5": "Peppa Pig and George Pig playing together with colourful balloons on the grass",
  "book:letters-3:5": "Peppa Pig cheering with both arms up under colourful bunting flags at a little party",
  "book:letters-4:10": "Peppa Pig waving under a big rainbow after the rain",
  "book:fruit-1:8": "Peppa Pig and George Pig happily eating fruit on a picnic blanket with apples, bananas, grapes and watermelon",
  "book:fruit-2:0": "Peppa Pig walking to a small corner shop with a red-and-white striped awning, holding an empty wicker shopping basket",
  "book:fruit-2:5": "Peppa Pig and her friend the cream-white rabbit girl in a pink dress holding a wicker basket full of apples, carrots and grapes, both smiling",
  "book:food-1:8": "the Pig family — Peppa, George, Mummy Pig and Daddy Pig — at the kitchen table with dinner, hands together, about to eat happily",
  "book:food-2:0": "George Pig in the kitchen holding his tummy, hungry, looking at the empty table",
  "book:food-2:4": "George Pig smiling widely at a table with bread, a glass of milk and a bowl of noodles",
  "book:animal-1:8": "Peppa Pig and the cream-white rabbit girl with animal friends — a puppy, a kitten, a bear and a duck — all smiling together",
  "book:animal-2:4": "Peppa Pig and George Pig singing with a dog, a cat and a duck, little music notes floating in the air",
  "book:family-1:0": "Peppa Pig waving hello in front of her yellow house on top of a green hill",
  "book:family-1:1": "Peppa Pig with her arm around her little brother George Pig, who holds his green toy dinosaur",
  "book:family-1:6": "the whole Pig family in a row smiling — Peppa, George, Mummy Pig, Daddy Pig, Granny Pig and Grandpa Pig — with little red hearts",
  "book:family-2:3": "Peppa Pig in a cap and shoes waving goodbye at the front door to Mummy Pig and Daddy Pig",
};

const need = <T,>(map: Record<string, T>, key: string): T => {
  const v = map[key];
  if (v === undefined) throw new Error(`프롬프트가 없어요: ${key}`);
  return v;
};

/** 이모지 → 파일 이름(코드포인트) — 이음표·글자모양 선택자는 뺀다 */
const slug = (emoji: string) =>
  [...emoji]
    .map((c) => (c.codePointAt(0) ?? 0).toString(16))
    .filter((h) => h !== "fe0f" && h !== "200d")
    .join("-");
const iconFile = (key: string) => `img/icons/${key.replace(/^icon:/, "").replace(/:/g, "-")}.webp`;

const items: Item[] = [];
const push = (key: string, file: string, refs: Refs, params: Params, prompt: string) => items.push({ key, file, refs, params, prompt });

for (const e of list.characters) {
  if (e.key === "bg:home") continue;
  if (e.key === "app-icon") {
    push(e.key, "img/app-icon.png", "cast", { ...cutout(), background: "opaque" }, `App icon: Peppa Pig's head, smiling, centred on a plain sky-blue background, bold and simple. ${AS_REF} ${STYLE}`);
    continue;
  }
  push(e.key, `img/peppa/${e.key === "mascot" ? "happy" : e.key.split(":")[1]}.webp`, "cast", cutout(), `${need(MASCOT_EN, e.key)}. ${AS_REF} ${CUTOUT} ${STYLE}`);
}
// 큰 카드로 보이는 메뉴(작업실·읽기 연습)도 페파 가족이 그 놀이를 하는 그림 — 2026-10-26 사용자 요청("하나하나도 페파스럽게")
const SCENE_ICON_EN: Record<string, string> = {
  "studio:draw": "Peppa Pig drawing a picture on paper with colourful crayons, full body",
  "studio:color": "George Pig colouring in a picture with a big crayon, full body",
  "studio:letter-color": "Peppa Pig holding a big colouring pencil next to a cup full of colourful pencils, full body",
  "studio:word-write": "Mummy Pig writing on lined paper with a pencil, full body",
  "studio:sentence-write": "Daddy Pig writing on a paper scroll with a feather quill, full body",
  "studio:card": "Peppa Pig holding up a pink envelope with a red heart on it, full body",
  "reading:coach": "Peppa Pig reading aloud into a microphone, full body",
  "reading:record": "George Pig holding a cassette tape recorder and listening happily, full body",
  "reading:books": "Peppa Pig hugging a stack of colourful picture books, full body",
};
for (const e of list.icons) {
  const id = e.key.replace(/^icon:/, "");
  if (id.startsWith("menu:")) {
    push(e.key, iconFile(e.key), "cast", cutout(), `Menu icon: ${need(MENU_EN, id.slice(5))}. ${AS_REF} ${CUTOUT} ${STYLE}`);
  } else if (SCENE_ICON_EN[id]) {
    push(e.key, iconFile(e.key), "cast", cutout(), `Menu icon: ${SCENE_ICON_EN[id]}. ${AS_REF} ${CUTOUT} ${STYLE}`);
  } else {
    push(e.key, iconFile(e.key), "object", cutout(), `Icon: ${need(ICON_EN, id)}. ${CUTOUT} ${STYLE}`);
  }
}
for (const c of CAST) {
  const ref: Refs = c.id === "rabbit" ? "rabbit" : "cast";
  push(
    `color:${c.id}`,
    `img/color/${c.id}.png`,
    ref,
    page,
    `Colouring page for a 4-year-old: ${c.look}, standing, full body, centred. Black outlines only on a plain white background — no colour, no grey, no shading; thick clean lines; every shape closed. Same shapes as the reference character, Peppa Pig cartoon style. No text.`,
  );
}
const castByWord = new Map(CAST.flatMap((c) => (c.word ? [[c.word, c] as const] : [])));
for (const w of WORDS) {
  const c = castByWord.get(w.text);
  const file = `img/words/${slug(w.emoji)}.webp`;
  if (c) {
    push(w.text, file, c.id === "rabbit" ? "rabbit" : "cast", cutout(), `Picture card: ${c.look}, standing and smiling, full body. ${AS_REF} ${CUTOUT} ${STYLE}`);
  } else if (ANIMALS.has(w.text)) {
    push(w.text, file, "animal", cutout(), `Picture card: ${need(WORD_EN, w.text)}, cute, drawn the way the show draws its animal friends. ${CUTOUT} ${STYLE}`);
  } else if (PEOPLE.has(w.text)) {
    push(w.text, file, "cast", cutout(), `Picture card: ${need(WORD_EN, w.text)}, full body, in the same character style as the references. ${CUTOUT} ${STYLE}`);
  } else {
    push(w.text, file, "object", cutout(), `Picture card: ${need(WORD_EN, w.text)}, instantly recognisable for a 4-year-old. ${CUTOUT} ${STYLE}`);
  }
}
for (const e of list.bookScenes) {
  const ref: Refs = /rabbit girl/.test(need(SCENE_EN, e.key)) ? "rabbit" : "cast";
  push(e.key, `img/books/${e.key.replace(/^book:/, "").replace(/:/g, "-")}.webp`, ref, scene, `Picture-book page: ${need(SCENE_EN, e.key)}. ${AS_REF} Simple Peppa Pig setting with flat green grass and light-blue sky unless stated. ${STYLE}`);
}

// 화면 바탕 — 페파 동화마을의 장소. 가장자리에만 풍경을 두고 가운데는 비워서 버튼·카드가 잘 보이게
const wide: Params = { model: "gpt_image_2_5", quality: "medium", resolution: "2k", aspect_ratio: "16:9", background: "opaque" };
const SCENE_BG_EN: Record<string, string> = {
  "bg:play": "Peppa Pig's garden — flat green grass along the bottom with a few flowers and a little white picket fence, light-blue sky with a few simple clouds and a round sun",
  "bg:free": "a children's playground on green grass — a swing set at the left edge and a slide at the right edge, light-blue sky with simple clouds",
  "bg:missions": "Peppa Pig's playgroup — a small school building with a bell on a green hill at the right edge, a round tree at the left edge, light-blue sky",
  "bg:galaxy": "a friendly night sky — dark navy blue with small yellow stars, a smiling crescent moon in the top corner and two simple round planets near the edges",
  "bg:reading": "a cosy reading room — wooden bookshelves full of colourful books at the left and right edges, a round rug on the floor, a window with blue sky at the top",
  "bg:studio": "a cheerful art corner — an easel with a blank canvas at the left edge, pots of paint and brushes on a little table at the right edge, a window with blue sky",
};
for (const e of list.scenes ?? []) {
  push(e.key, `img/bg/${e.key.slice(3)}.webp`, "scene", wide, `Wide background for a children's app screen: ${need(SCENE_BG_EN, e.key)}. No characters, no people. Keep the whole middle area plain and empty so buttons and cards can sit on top. ${STYLE}`);
}
const UI_EN: Record<string, string> = {
  "icon:ui:lock": "a cute golden padlock",
  "icon:ui:heart": "a red heart",
  "icon:ui:party": "a party popper bursting with colourful confetti",
  "icon:ui:sparkle": "three twinkling yellow sparkles",
  "icon:ui:rainbow": "a rainbow with a little white cloud at each end",
  "icon:ui:gem": "a sparkly blue gem",
  "icon:ui:music": "two joined music notes",
  "icon:ui:eraser": "a pink rubber eraser",
  "icon:ui:undo": "a thick curved arrow turning back to the left",
  "icon:ui:trash": "a little green rubbish bin with a lid",
  "icon:ui:save": "a wooden picture frame with a tiny painting of a sun over a green hill inside",
  "icon:tool:pencil": "a yellow pencil lying diagonally, its sharpened tip pointing to the bottom-left corner",
  "icon:tool:crayon": "a red wax crayon lying diagonally, its tip pointing to the bottom-left corner",
  "icon:tool:brush": "a paintbrush with a wooden handle and pink paint on its bristles, lying diagonally with the bristles pointing to the bottom-left corner",
  "icon:tool:glitter": "a sparkly glitter pen with tiny twinkling stars at its tip, lying diagonally with the tip pointing to the bottom-left corner",
  "icon:tool:rainbow": "a rainbow-striped crayon lying diagonally, its tip pointing to the bottom-left corner",
  "icon:tool:bucket": "a small blue paint bucket tipping over with a big splash of pink paint",
};
for (const e of list.ui ?? []) {
  push(e.key, iconFile(e.key), "object", cutout(), `Icon: ${need(UI_EN, e.key)}. ${CUTOUT} ${STYLE}`);
}

// 놀이터 큰 카드 — 페파 가족이 그 놀이를 하는 장면(인물 레퍼런스)
const FREE_SCENE_EN: Record<string, string> = {
  "scene:free:sound-station": "Peppa Pig standing at a little bus stop sign, a small red bus arriving behind her",
  "scene:free:letter-mine": "George Pig in a yellow hard hat swinging a small pickaxe at a big grey rock with sparkling blue gems",
  "scene:free:letter-wheel": "Peppa Pig spinning a big colourful prize wheel",
  "scene:free:trace": "Mummy Pig tracing a dotted line on a sheet of paper with a yellow pencil",
  "scene:free:free-write": "Peppa Pig writing on a small chalkboard with a piece of chalk",
  "scene:free:word-card": "George Pig holding up a fan of colourful picture cards",
  "scene:free:rhythm": "Peppa Pig happily playing a small red drum with two drumsticks, music notes floating",
  "scene:free:assemble": "George Pig putting together big colourful jigsaw puzzle pieces",
  "scene:free:cauldron": "Grandpa Pig stirring a bubbling green cauldron with a big wooden spoon",
  "scene:free:word-soccer": "George Pig kicking a football towards a small white goal",
  "scene:free:listen-pick": "Peppa Pig wearing big blue headphones and listening happily",
  "scene:free:pieces": "Peppa Pig sticking colourful paper pieces together with a glue stick",
  "scene:free:explain": "Granny Pig pointing at a big picture card and explaining",
  "scene:free:find-me": "Peppa Pig looking through a big magnifying glass",
  "scene:free:read-answer": "Daddy Pig reading an open picture book and raising one hand happily",
};
for (const e of list.freeScenes ?? []) {
  push(e.key, `img/scenes/${e.key.replace(/^scene:/, "").replace(/:/g, "-")}.webp`, "cast", cutout(), `Picture card: ${need(FREE_SCENE_EN, e.key)}, full body. ${AS_REF} ${CUTOUT} ${STYLE}`);
}

const files = new Set<string>();
for (const it of items) {
  if (files.has(it.file)) throw new Error(`파일 이름이 겹쳐요: ${it.file}`);
  files.add(it.file);
}
const credits = items.reduce((n, it) => n + (it.params.resolution === "2k" ? 1 : 0.5), 0);
writeFileSync(new URL("./image-prompts.json", import.meta.url), JSON.stringify({ count: items.length, credits, items }, null, 2) + "\n");
console.log(`프롬프트 ${items.length}개 · 예상 ${credits}크레딧 → scripts/image-prompts.json`);
