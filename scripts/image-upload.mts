/**
 * 그림을 회사 Cafe24 호스팅(FTP)에 올린다 — 앱은 "/cdn/…" 으로 불러오고 next.config 가 그쪽으로 이어 준다.
 *   npm run image:upload            이미 같은 크기로 올라간 파일은 건너뛴다(여러 번 돌려도 된다)
 * 올리는 것: image-manifest.json 에 적힌 파일 전부(public/img/…) → <CAFE24_UPLOAD_DIR>/<img/ 를 뺀 경로>
 *   예) public/img/words/1f34e.webp → /app/img/lsh/pig/words/1f34e.webp → https://yogibo.openhost.cafe24.com/app/img/lsh/pig/words/1f34e.webp
 * .env.local: CAFE24_FTP_HOST · CAFE24_FTP_PORT · CAFE24_FTP_USER · CAFE24_FTP_PASS · CAFE24_UPLOAD_DIR · CAFE24_PUBLIC_BASE_URL
 * 파일 이름은 모두 영문·숫자 — Cafe24 는 한글 파일 이름을 못 찾는다(403).
 */

import { readFileSync, statSync } from "node:fs";
import { posix, resolve } from "node:path";
import { Client } from "basic-ftp";

const root = resolve(import.meta.dirname, "..");
const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`.env.local 에 ${k} 가 없어요`);
  return v;
};
const dir = "/" + env("CAFE24_UPLOAD_DIR").replace(/^\/+|\/+$/g, "");
const base = new URL(dir.slice(1) + "/", env("CAFE24_PUBLIC_BASE_URL")).href;

const manifest = JSON.parse(readFileSync(resolve(root, "src/content/image-manifest.json"), "utf8")) as Record<string, string>;
// manifest 의 "?v=…"(내용 해시)는 주소용 — 파일 이름에서는 뗀다
const files = [...new Set(Object.values(manifest).map((f) => f.split("?")[0]))].sort();

let client = new Client(30_000);
const connect = () =>
  client.access({ host: env("CAFE24_FTP_HOST"), port: Number(process.env.CAFE24_FTP_PORT || 21), user: env("CAFE24_FTP_USER"), password: env("CAFE24_FTP_PASS"), secure: false });
await connect();

/** Cafe24 FTP 는 가끔 데이터 연결이 끊긴다 — 다시 접속해서 두 번까지 더 해 본다 */
async function retry<T>(job: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await job();
    } catch (e) {
      if (i >= 2) throw e;
      client.close();
      client = new Client(30_000);
      await connect();
    }
  }
}

// 폴더별로 이미 있는 파일 크기를 한 번에 읽는다
const remoteSizes = new Map<string, number>();
const listed = new Set<string>();
async function sizeOf(remote: string): Promise<number | undefined> {
  const folder = posix.dirname(remote);
  if (!listed.has(folder)) {
    listed.add(folder);
    try {
      for (const f of await retry(() => client.list(folder))) if (f.isFile) remoteSizes.set(posix.join(folder, f.name), f.size);
    } catch {
      // 폴더가 아직 없다
    }
  }
  return remoteSizes.get(remote);
}

let sent = 0;
let skipped = 0;
for (const f of files) {
  const local = resolve(root, "public", f);
  const remote = posix.join(dir, f.replace(/^img\//, ""));
  const size = statSync(local).size;
  if ((await sizeOf(remote)) === size) {
    skipped++;
    continue;
  }
  await retry(async () => {
    await client.ensureDir(posix.dirname(remote));
    await client.uploadFrom(local, remote);
  });
  sent++;
  if (sent % 20 === 0) console.log(`  올림 ${sent}…`);
}
client.close();
console.log(`올림 ${sent} · 이미 있음 ${skipped} · 전체 ${files.length} → ${base}`);
