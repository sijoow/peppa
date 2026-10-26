"use client";

import dynamic from "next/dynamic";
import { Splash } from "@/components/ui";

// 은하계 여행 — 진도·소리가 기기에 있어서 기기에서만 그린다
const Screen = dynamic(() => import("@/components/galaxy/GalaxyScreen"), { ssr: false, loading: () => <Splash /> });

export default function Page() {
  return <Screen />;
}
