"use client";

import { useEffect } from "react";
import { startSync } from "@/lib/sync";

/** 앱이 뜨면 MongoDB 와 진도를 맞추기 시작한다 — 화면에는 아무것도 그리지 않는다 */
export function SyncBoot() {
  useEffect(() => {
    startSync();
  }, []);
  return null;
}
