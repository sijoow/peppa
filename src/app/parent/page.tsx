"use client";

import dynamic from "next/dynamic";
import { Splash } from "@/components/ui";

// 부모 페이지 — 진도·기록이 기기에 있어서 기기에서만 그린다
const ParentScreen = dynamic(() => import("@/components/parent/ParentScreen"), { ssr: false, loading: () => <Splash /> });

export default function Page() {
  return <ParentScreen />;
}
