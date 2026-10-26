"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Peppa } from "@/components/Peppa";
import { SyncBoot } from "@/components/SyncBoot";
import { Backdrop, Splash, SquishButton } from "@/components/ui";
import { login, useAuth } from "@/lib/auth";
import { OrientationBoot } from "@/lib/orientation";
import { sfx } from "@/lib/sfx";

/** 처음 화면 — 아이디로 로그인. 아이디마다 진도가 따로, 마스터 아이디는 관리자 */
function LoginScreen() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !id || !password) return;
    sfx.wake();
    setBusy(true);
    setError(null);
    const err = await login(id, password);
    setBusy(false);
    if (err) {
      sfx.boop();
      setError(err);
      return;
    }
    sfx.cheer();
  };

  const field = "w-full rounded-[1.4rem] border-4 border-paper-deep bg-card px-5 py-3 font-body text-2xl text-ink outline-none select-text focus:border-sky-deep";

  return (
    <main className="relative grid h-dvh place-items-center overflow-hidden">
      <Backdrop scene="home" />
      <form onSubmit={submit} className="relative flex w-[min(92vw,460px)] flex-col items-center gap-4 rounded-[3rem] bg-card/90 px-10 py-8 shadow-[0_10px_0_var(--paper-deep)]">
        <Peppa size={130} className="animate-float" />
        <h1 className="peppa-title text-center text-5xl leading-tight">
          하온이의
          <br />
          한글나라
        </h1>
        <input className={field} placeholder="아이디" autoCapitalize="none" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} />
        <input
          className={field}
          placeholder="비밀번호"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="font-body text-lg text-peach-deep">{error}</p>}
        <SquishButton type="submit" tone="peach" disabled={busy || !id || !password} className="mt-1 w-full rounded-full py-4 text-3xl">
          {busy ? "확인 중…" : "들어가기"}
        </SquishButton>
      </form>
    </main>
  );
}

/** 로그인해야 앱이 보인다 — 로그인하면 MongoDB 와 진도를 맞추기 시작 */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (auth === undefined) return <Splash />;
  if (!auth) return <LoginScreen />;
  return (
    <>
      <SyncBoot />
      <OrientationBoot />
      {children}
    </>
  );
}
