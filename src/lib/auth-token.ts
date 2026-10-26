/**
 * 로그인 — 서버에서만 쓴다(API 라우트). 계정은 환경변수 ACCOUNTS 에 둔다:
 *   ACCOUNTS="master:0000:master,haneul:1234:child"   (아이디:비밀번호:역할, 쉼표로 여러 개)
 *   master — 마스터(부모·미리 보기): 모든 메뉴가 열리고 하루 한 번 제한이 없다
 *   child  — 아이: 진도대로 열린다
 * 로그인하면 서명한 열쇠(토큰)를 준다 — AUTH_SECRET 으로 서명, 1년짜리. 진도 API 는 이 열쇠의 아이디로 저장한다.
 * 순수 파일(시크릿·시각은 인자로) — node --test 가 그대로 읽는다.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type Role = "master" | "child";

export interface Account {
  id: string;
  password: string;
  role: Role;
}

export interface TokenUser {
  id: string;
  role: Role;
}

const ID_RE = /^[a-z0-9_-]{2,32}$/;

/** "아이디:비밀번호:역할,…" → 계정들. 모양이 틀린 줄은 버린다 */
export function parseAccounts(raw: string | undefined): Account[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [id, password, role] = s.split(":").map((x) => x.trim());
      return { id: (id ?? "").toLowerCase(), password: password ?? "", role: role === "master" ? "master" : "child" } as Account;
    })
    .filter((a) => ID_RE.test(a.id) && a.password.length > 0);
}

/** 길이가 달라도 시간 차이가 나지 않게 해시해서 비교 */
function same(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkLogin(accounts: Account[], id: string, password: string): TokenUser | null {
  const want = id.trim().toLowerCase();
  const acc = accounts.find((a) => a.id === want);
  // 없는 아이디여도 같은 일을 해서 있는지 없는지 티가 나지 않게
  const ok = same(acc?.password ?? "\u0000none", password);
  return acc && ok ? { id: acc.id, role: acc.role } : null;
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64url");

export function signToken(user: TokenUser, secret: string, now: number, days = 365): string {
  const body = b64(JSON.stringify({ id: user.id, role: user.role, exp: now + days * 86_400_000 }));
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string | null | undefined, secret: string, now: number): TokenUser | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = createHmac("sha256", secret).update(body).digest("base64url");
  if (!same(want, sig)) return null;
  try {
    const o = JSON.parse(Buffer.from(body, "base64url").toString()) as { id?: unknown; role?: unknown; exp?: unknown };
    if (typeof o.id !== "string" || !ID_RE.test(o.id) || typeof o.exp !== "number" || o.exp < now) return null;
    return { id: o.id, role: o.role === "master" ? "master" : "child" };
  } catch {
    return null;
  }
}
