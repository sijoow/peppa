/**
 * 로그인 서버 도우미 — 환경변수에서 계정·시크릿을 읽고, 요청의 열쇠(Authorization: Bearer)를 확인한다.
 *   ACCOUNTS     아이디:비밀번호:역할,… (lib/auth-token 참고)
 *   AUTH_SECRET  열쇠 서명용 비밀 문자열 — 배포(Vercel)에서는 꼭 넣는다. 로컬 개발은 비어 있으면 개발용 값으로 돈다
 */

import { parseAccounts, verifyToken, type Account, type TokenUser } from "@/lib/auth-token";

export function accounts(): Account[] {
  return parseAccounts(process.env.ACCOUNTS);
}

export function authSecret(): string | null {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  return process.env.NODE_ENV === "production" ? null : "dev-only-secret-change-me";
}

export function userFrom(req: Request): TokenUser | null {
  const secret = authSecret();
  if (!secret) return null;
  const h = req.headers.get("authorization") ?? "";
  return verifyToken(h.startsWith("Bearer ") ? h.slice(7) : null, secret, Date.now());
}
