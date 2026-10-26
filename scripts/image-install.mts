/**
 * 힉스필드 결과를 내려받아 앱에 넣는다.
 *   npm run image:install -- drafts/2026-10-26
 * <폴더>/results.json { "그림 키": "결과 URL" } 을 읽어
 *   원본 PNG   → <폴더>/png/<파일>.png   (gitignore — 다시 줄일 때 쓴다, 이미 받은 건 건너뜀)
 *   앱용 그림  → public/<파일>            (낱말·아이콘·페파 512px WebP, 책 장면 1024px, 색칠 선 그림 1600px 흑백 PNG)
 *   src/content/image-manifest.json 을 다시 만든다 — 인물 카드(cast:*)는 그대로, 낱말이 그대로 나오는 책 쪽은 낱말 그림을 같이 쓴다.
 * 첫 화면 바탕은 시안(<폴더>/gpt-3-home-bg.png)을 그대로 쓴다.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";
import { BOOKS } from "../src/curriculum/books.ts";
import { WORDS } from "../src/curriculum/words.ts";

const root = resolve(import.meta.dirname, "..");
const dir = resolve(root, process.argv[2] ?? "");
if (!process.argv[2] || !existsSync(resolve(dir, "results.json"))) throw new Error("쓰는 법: npm run image:install -- <results.json 이 있는 폴더>");

type Item = { key: string; file: string };
const { items } = JSON.parse(readFileSync(resolve(root, "scripts/image-prompts.json"), "utf8")) as { items: Item[] };
const fileOf = new Map(items.map((it) => [it.key, it.file]));
const results = JSON.parse(readFileSync(resolve(dir, "results.json"), "utf8")) as Record<string, string>;
const manifestPath = resolve(root, "src/content/image-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, string>;

const ensureDir = (f: string) => mkdirSync(dirname(f), { recursive: true });

async function download(url: string, to: string) {
  if (existsSync(to)) return;
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ensureDir(to);
      writeFileSync(to, Buffer.from(await res.arrayBuffer()));
      return;
    } catch (e) {
      if (i >= 2) throw e;
    }
  }
}

/** 원본 PNG → 앱용 파일. 크기는 쓰는 자리에 맞춘다 */
async function shrink(src: string, file: string) {
  const out = resolve(root, "public", file);
  ensureDir(out);
  const img = sharp(src);
  if (file.startsWith("img/color/")) {
    // 색칠 선 그림 — 흑백으로, 선만 또렷하게(ColorPad 가 어두운 픽셀을 선으로 본다)
    await img.resize({ width: 1600, withoutEnlargement: true }).flatten({ background: "#ffffff" }).grayscale().png({ compressionLevel: 9 }).toFile(out);
  } else if (file === "img/app-icon.png") {
    await img.resize(512, 512).png({ compressionLevel: 9 }).toFile(out);
  } else if (file.startsWith("img/books/")) {
    await img.resize(1024, 1024, { fit: "inside" }).webp({ quality: 86 }).toFile(out);
  } else if (file.startsWith("img/bg/")) {
    await img.resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 84 }).toFile(out);
  } else {
    await img.resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 88, alphaQuality: 100 }).toFile(out);
  }
}

let done = 0;
const missing: string[] = [];
for (const [key, url] of Object.entries(results)) {
  const file = fileOf.get(key);
  if (!file) {
    missing.push(key);
    continue;
  }
  const png = resolve(dir, "png", file.replace(/\.\w+$/, ".png"));
  await download(url, png);
  await shrink(png, file);
  manifest[key] = file;
  done++;
}

const homeBg = resolve(dir, "gpt-3-home-bg.png");
if (existsSync(homeBg)) {
  await shrink(homeBg, "img/bg/home.webp");
  manifest["bg:home"] = "img/bg/home.webp";
}

// 낱말이 그대로 나오는 책 쪽("사과 하나 쏙!")은 그 낱말 그림을 같이 쓴다 — scripts/image-list.mts 와 같은 규칙
const wordByEmoji = new Map(WORDS.map((w) => [w.emoji, w.text]));
for (const b of BOOKS) {
  b.pages.forEach((p, i) => {
    const word = wordByEmoji.get(p.art);
    const key = `book:${b.id}:${i}`;
    if (word && p.text.includes(word) && manifest[word] && !results[key]) manifest[key] = manifest[word];
  });
}

// 주소 끝에 내용 해시를 붙인다(?v=…) — Cafe24 앞단 캐시(2시간)·브라우저 캐시(7일) 때문에 같은 주소로 바꿔 올리면 예전 그림이 보인다
for (const [key, f] of Object.entries(manifest)) {
  const path = f.split("?")[0];
  const local = resolve(root, "public", path);
  if (existsSync(local)) manifest[key] = `${path}?v=${createHash("sha1").update(readFileSync(local)).digest("hex").slice(0, 8)}`;
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + "\n");
console.log(`넣음 ${done}장 · manifest ${Object.keys(sorted).length}개 키${missing.length ? ` · 모르는 키 ${missing.join(", ")}` : ""}`);
