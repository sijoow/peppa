import { userFrom } from "@/lib/auth-server";
import { configured, progressCollection } from "@/lib/db";
import { deleteChild, listChildren, saveChild } from "@/lib/users";

/*
 * 관리자(마스터) 전용 — 아이 계정 목록·만들기·비밀번호 바꾸기·지우기.
 * 목록에는 아이마다 진도 요약(문서 그대로)을 붙여 준다 — 관리자 화면이 진도율·리포트를 계산한다.
 */

export const dynamic = "force-dynamic";

function guard(req: Request): Response | null {
  const user = userFrom(req);
  if (!user) return Response.json({ error: "login" }, { status: 401 });
  if (user.role !== "master") return Response.json({ error: "forbidden" }, { status: 403 });
  return null;
}

export async function GET(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;
  try {
    const children = await listChildren();
    if (!configured()) return Response.json({ db: false, children: children.map((c) => ({ ...c, saved: null })) });
    const docs = await (await progressCollection()).find({ _id: { $in: children.map((c) => c.id) } }).toArray();
    return Response.json({
      db: true,
      children: children.map((c) => {
        const d = docs.find((x) => x._id === c.id);
        return { ...c, saved: d ? { progress: d.progress, settings: d.settings, updatedAt: d.updatedAt } : null };
      }),
    });
  } catch (e) {
    console.error("[api/admin/children] GET", e);
    return Response.json({ error: "db-error" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;
  if (!configured()) return Response.json({ error: "db-off" }, { status: 503 });
  let body: { id?: unknown; password?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad-json" }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : "";
  const password = typeof body.password === "string" && body.password ? body.password : null;
  const name = typeof body.name === "string" ? body.name : "";
  try {
    const r = await saveChild(id, password, name);
    if (r === "ok") return Response.json({ ok: true });
    return Response.json({ error: r }, { status: r === "taken" ? 409 : 400 });
  } catch (e) {
    console.error("[api/admin/children] POST", e);
    return Response.json({ error: "db-error" }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;
  if (!configured()) return Response.json({ error: "db-off" }, { status: 503 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  try {
    await deleteChild(id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[api/admin/children] DELETE", e);
    return Response.json({ error: "db-error" }, { status: 502 });
  }
}
