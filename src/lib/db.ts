/**
 * MongoDB 연결 — 서버(API 라우트)에서만 쓴다. 브라우저에는 접속 주소가 절대 나가지 않는다.
 *   MONGODB_URI  접속 주소 (.env.local / Vercel 환경변수)
 *   MONGO_DB     DB 이름 — 기본 'todohangul' (다른 앱 데이터와 섞이지 않게 따로)
 * 주소가 없으면 configured() 가 false — API 는 503 을 주고 앱은 기기 저장만으로 돈다.
 */

import { MongoClient, type Db } from "mongodb";
import type { Progress, Settings } from "@/lib/progress";

export interface ProgressDoc {
  /** 아이 프로필 — 지금은 'main' 하나. 형제가 생기면 늘린다 */
  _id: string;
  progress: Progress;
  settings: Settings;
  /** 기기가 마지막으로 바꾼 시각(ms) — 더 최신 쪽이 이긴다 */
  updatedAt: number;
  savedAt: Date;
}

const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGO_DB || "todohangul";

// 개발 서버는 파일을 고칠 때마다 모듈을 다시 읽는다 — 연결은 하나만 유지
const g = globalThis as unknown as { _todoMongo?: Promise<MongoClient> };

export function configured(): boolean {
  return Boolean(URI);
}

export async function db(): Promise<Db> {
  if (!URI) throw new Error("MONGODB_URI 미설정 (.env.local 을 확인하세요)");
  g._todoMongo ??= new MongoClient(URI, { serverSelectionTimeoutMS: 8000 }).connect().catch((e) => {
    g._todoMongo = undefined;
    throw e;
  });
  return (await g._todoMongo).db(DB_NAME);
}

export async function progressCollection() {
  return (await db()).collection<ProgressDoc>("progress");
}
