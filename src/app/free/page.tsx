"use client";

import dynamic from "next/dynamic";
import { Splash } from "@/components/ui";

// 자유 모드 — 진도·소리가 기기에 있어서 기기에서만 그린다
const Screen = dynamic(() => import("@/components/free/FreeScreen"), { ssr: false, loading: () => <Splash /> });

export default function Page() {
  return <Screen />;
}
