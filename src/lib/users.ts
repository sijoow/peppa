/**
 * 아이 계정 — 관리자(마스터)가 만든다. MongoDB users 컬렉션: { _id: 아이디, name, hash, salt, createdAt }.
 * 비밀번호는 scrypt 로 바꿔서만 둔다. 마스터 계정은 환경변수 ACCOUNTS 에만 있다(lib/auth-server).
 * DB 가 없으면(로컬·미설정) ACCOUNTS 의 계정만 쓴다.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { configured, db } from "@/lib/db";
import { accounts } from "@/lib/auth-server";
import { checkLogin, type TokenUser } from "@/lib/auth-token";

export interface UserDoc {
  _id: string;
  name: string;
  hash: string;
  salt: string;
  createdAt: Date;
}

export const ID_RE = /^[a-z0-9_-]{2,32}$/;

function hashOf(password: string, salt: string): string {
  return scryptSync(password, salt, 32).toString("hex");
}

export async function usersCollection() {
  return (await db()).collection<UserDoc>("users");
}

/** 로그인 확인 — 환경변수 계정 먼저, 없으면 DB 아이 계정 */
export async function login(id: string, password: string): Promise<TokenUser | null> {
  const fromEnv = checkLogin(accounts(), id, password);
  if (fromEnv) return fromEnv;
  if (!configured()) return null;
  const doc = await (await usersCollection()).findOne({ _id: id.trim().toLowerCase() });
  if (!doc) return null;
  const a = Buffer.from(hashOf(password, doc.salt), "hex");
  const b = Buffer.from(doc.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b) ? { id: doc._id, role: "child" } : null;
}

/** 관리자 화면의 아이 목록 — 환경변수 아이 계정 + DB 아이 계정 */
export async function listChildren(): Promise<{ id: string; name: string; source: "env" | "db" }[]> {
  const env = accounts()
    .filter((a) => a.role === "child")
    .map((a) => ({ id: a.id, name: a.id, source: "env" as const }));
  if (!configured()) return env;
  const docs = await (await usersCollection()).find({}, { projection: { hash: 0, salt: 0 } }).sort({ createdAt: 1 }).toArray();
  return [...env, ...docs.filter((d) => !env.some((e) => e.id === d._id)).map((d) => ({ id: d._id, name: d.name || d._id, source: "db" as const }))];
}

/** 아이 계정 만들기·비밀번호 바꾸기 */
export async function saveChild(id: string, password: string | null, name: string): Promise<"ok" | "taken" | "bad"> {
  const _id = id.trim().toLowerCase();
  if (!ID_RE.test(_id) || name.length > 30) return "bad";
  if (accounts().some((a) => a.id === _id)) return "taken";
  const col = await usersCollection();
  const cur = await col.findOne({ _id });
  if (!cur && !password) return "bad";
  if (password !== null && (password.length < 4 || password.length > 64)) return "bad";
  const salt = password ? randomBytes(16).toString("hex") : (cur?.salt ?? "");
  const hash = password ? hashOf(password, salt) : (cur?.hash ?? "");
  await col.replaceOne({ _id }, { name: name.trim() || _id, hash, salt, createdAt: cur?.createdAt ?? new Date() }, { upsert: true });
  return "ok";
}

export async function deleteChild(id: string): Promise<void> {
  await (await usersCollection()).deleteOne({ _id: id.trim().toLowerCase() });
}
