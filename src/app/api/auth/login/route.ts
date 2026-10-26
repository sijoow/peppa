import { authSecret } from "@/lib/auth-server";
import { signToken } from "@/lib/auth-token";
import { login } from "@/lib/users";

/** 로그인 — 아이디·비밀번호가 맞으면 1년짜리 열쇠(토큰)를 준다. 태블릿은 이 열쇠를 기억해 다시 묻지 않는다 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = authSecret();
  if (!secret) return Response.json({ error: "no-secret" }, { status: 503 });
  let body: { id?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad-json" }, { status: 400 });
  }
  if (typeof body.id !== "string" || typeof body.password !== "string") return Response.json({ error: "bad" }, { status: 400 });
  try {
    const user = await login(body.id, body.password);
    if (!user) return Response.json({ error: "wrong" }, { status: 401 });
    return Response.json({ token: signToken(user, secret, Date.now()), user });
  } catch (e) {
    console.error("[api/auth/login]", e);
    return Response.json({ error: "db-error" }, { status: 502 });
  }
}
