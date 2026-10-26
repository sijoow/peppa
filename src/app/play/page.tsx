"use client";

import dynamic from "next/dynamic";
import { Splash } from "@/components/ui";

// 오늘의 모험 — 진도·소리가 기기에 있어서 기기에서만 그린다
const SessionScreen = dynamic(() => import("@/components/play/SessionScreen"), { ssr: false, loading: () => <Splash /> });

export default function Page() {
  return <SessionScreen />;
}
