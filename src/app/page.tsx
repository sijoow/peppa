"use client";

import dynamic from "next/dynamic";
import { Splash } from "@/components/ui";

// 진도가 기기 안(localStorage)에 있어서 화면은 기기에서만 그린다 — 빌드 때는 불러오는 화면만 만든다
const HomeScreen = dynamic(() => import("@/components/home/HomeScreen"), { ssr: false, loading: () => <Splash /> });

export default function Page() {
  return <HomeScreen />;
}
