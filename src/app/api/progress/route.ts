import { userFrom } from "@/lib/auth-server";
import { configured, progressCollection } from "@/lib/db";
import { normalizeProgress, normalizeSettings } from "@/lib/progress";

/*
 * 진도 저장소 — 로그인한 아이디 한 명 = 문서 하나. GET 으로 읽고 PUT 으로 통째로 바꾼다.
 * 관리자(마스터)는 ?profile=아이디 로 아이 진도를 읽고 바꿀 수 있다(관리자 화면). 아이 계정은 자기 것만.
 * 두 기기가 같이 쓰면 updatedAt 이 더 최신인 쪽이 이긴다 — 늦게 온 옛 값은 409 와 함께 서버 값을 돌려준다.
 */

export const dynamic = "force-dynamic";

function target(req: Request): { profile: string } | Response {
  const user = userFrom(req);
  if (!user) return Response.json({ error: "login" }, { status: 401 });
  if (!configured()) return Response.json({ error: "db-off" }, { status: 503 });
  const asked = new URL(req.url).searchParams.get("profile");
  if (!asked || asked === user.id) return { profile: user.id };
  if (user.role !== "master" || !/^[a-z0-9_-]{2,32}$/.test(asked)) return Response.json({ error: "forbidden" }, { status: 403 });
  return { profile: asked };
}

export async function GET(req: Request) {
  const t = target(req);
  if (t instanceof Response) return t;
  try {
    const doc = await (await progressCollection()).findOne({ _id: t.profile });
    return Response.json({ saved: doc ? { progress: doc.progress, settings: doc.settings, updatedAt: doc.updatedAt } : null });
  } catch (e) {
    console.error("[api/progress] GET", e);
    return Response.json({ error: "db-error" }, { status: 502 });
  }
}

export async function PUT(req: Request) {
  const t = target(req);
  if (t instanceof Response) return t;
  let body: { progress?: unknown; settings?: unknown; updatedAt?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad-json" }, { status: 400 });
  }
  const updatedAt = typeof body.updatedAt === "number" && Number.isFinite(body.updatedAt) ? body.updatedAt : 0;
  const progress = normalizeProgress(body.progress);
  const settings = normalizeSettings(body.settings);
  try {
    const col = await progressCollection();
    const cur = await col.findOne({ _id: t.profile });
    if (cur && cur.updatedAt > updatedAt) {
      return Response.json({ error: "stale", saved: { progress: cur.progress, settings: cur.settings, updatedAt: cur.updatedAt } }, { status: 409 });
    }
    await col.replaceOne({ _id: t.profile }, { progress, settings, updatedAt, savedAt: new Date() }, { upsert: true });
    return Response.json({ ok: true, updatedAt });
  } catch (e) {
    console.error("[api/progress] PUT", e);
    return Response.json({ error: "db-error" }, { status: 502 });
  }
}
