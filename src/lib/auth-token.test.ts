import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { checkLogin, parseAccounts, signToken, verifyToken } from "./auth-token.ts";

const NOW = 1_800_000_000_000;

describe("로그인", () => {
  const accounts = parseAccounts(" master:0000:master , Haneul:1234:child, 깨진줄, x:1:child ");

  it("계정 목록 — 아이디는 소문자, 역할은 master/child, 모양 틀린 줄은 버림", () => {
    assert.deepEqual(accounts, [
      { id: "master", password: "0000", role: "master" },
      { id: "haneul", password: "1234", role: "child" },
    ]);
  });

  it("아이디·비밀번호가 맞아야 들어간다 (아이디 대소문자는 상관없이)", () => {
    assert.deepEqual(checkLogin(accounts, "HANEUL", "1234"), { id: "haneul", role: "child" });
    assert.deepEqual(checkLogin(accounts, "master", "0000"), { id: "master", role: "master" });
    assert.equal(checkLogin(accounts, "haneul", "0000"), null);
    assert.equal(checkLogin(accounts, "nobody", "1234"), null);
  });

  it("열쇠 — 서명이 맞고 기한 안이면 통과, 고치거나 다른 시크릿이거나 기한이 지나면 실패", () => {
    const t = signToken({ id: "haneul", role: "child" }, "s3cret", NOW);
    assert.deepEqual(verifyToken(t, "s3cret", NOW + 1000), { id: "haneul", role: "child" });
    assert.equal(verifyToken(t, "other", NOW), null);
    assert.equal(verifyToken(t, "s3cret", NOW + 366 * 86_400_000), null);
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ id: "haneul", role: "master", exp: NOW + 1e12 })).toString("base64url");
    assert.equal(verifyToken(`${forged}.${sig}`, "s3cret", NOW), null, "역할을 바꿔치기하면 실패");
    assert.equal(verifyToken(`${body}.`, "s3cret", NOW), null);
    assert.equal(verifyToken(null, "s3cret", NOW), null);
  });
});
